const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Parse package.json dependencies
function parsePackageJson(content) {
    try {
        const packageJson = JSON.parse(content);
        const dependencies = {
            ...packageJson.dependencies || {},
            ...packageJson.devDependencies || {}
        };
        
        return Object.entries(dependencies).map(([name, version]) => {
            // Clean up version string (remove ^, ~, etc.)
            const cleanVersion = version.replace(/[\^~>=<]/g, '');
            return { name, version: cleanVersion };
        });
    } catch (error) {
        throw new Error('Invalid package.json format');
    }
}

// Parse requirements.txt dependencies
function parseRequirementsTxt(content) {
    const lines = content.split('\n');
    const dependencies = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
            let name, version;
            
            // Handle different formats: package==1.0.0, package>=1.0.0, etc.
            if (trimmedLine.includes('==')) {
                [name, version] = trimmedLine.split('==');
            } else if (trimmedLine.includes('>=')) {
                [name, version] = trimmedLine.split('>=');
            } else if (trimmedLine.includes('>')) {
                [name, version] = trimmedLine.split('>');
            } else if (trimmedLine.includes('<=')) {
                [name, version] = trimmedLine.split('<=');
            } else if (trimmedLine.includes('<')) {
                [name, version] = trimmedLine.split('<');
            } else if (trimmedLine.includes('~=')) {
                [name, version] = trimmedLine.split('~=');
            } else {
                name = trimmedLine;
                version = 'latest';
            }
            
            // Clean up name (remove extras like [test])
            name = name.split('[')[0].trim();
            
            if (name) {
                dependencies.push({ 
                    name, 
                    version: version ? version.trim() : 'latest' 
                });
            }
        }
    }
    
    return dependencies;
}

// Check vulnerabilities using OSV API
async function checkVulnerabilities(packages, ecosystem) {
    try {
        const osvApiUrl = 'https://api.osv.dev/v1/query';
        const results = [];
        
        // Process packages in batches to avoid overloading the API
        const batchSize = 10;
        for (let i = 0; i < packages.length; i += batchSize) {
            const batch = packages.slice(i, i + batchSize);
            const batchPromises = batch.map(async (pkg) => {
                try {
                    const response = await axios.post(osvApiUrl, {
                        package: {
                            name: pkg.name,
                            ecosystem: ecosystem === 'npm' ? 'npm' : 'PyPI'
                        },
                        version: pkg.version
                    });
                    
                    return { 
                        ...pkg, 
                        vulnerabilities: response.data.vulns || [] 
                    };
                } catch (error) {
                    console.error(`Error checking vulnerability for ${pkg.name}:`, error.message);
                    return { ...pkg, vulnerabilities: [] };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return results;
    } catch (error) {
        console.error('Error checking vulnerabilities:', error);
        throw new Error('Failed to check vulnerabilities');
    }
}

// Check maintenance status using GitHub API
async function checkMaintenanceStatus(packages, ecosystem) {
    try {
        for (const pkg of packages) {
            try {
                // For npm packages, we can try to get the GitHub repository from npm registry
                if (ecosystem === 'npm') {
                    const npmResponse = await axios.get(`https://registry.npmjs.org/${pkg.name}`);
                    
                    if (npmResponse.data.repository && npmResponse.data.repository.url) {
                        const repoUrl = npmResponse.data.repository.url;
                        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
                        
                        if (match) {
                            const [, owner, repo] = match;
                            
                            // Get latest version
                            if (npmResponse.data['dist-tags'] && npmResponse.data['dist-tags'].latest) {
                                pkg.latestVersion = npmResponse.data['dist-tags'].latest;
                                pkg.isOutdated = pkg.version !== pkg.latestVersion;
                            }
                            
                            // Check GitHub repository stats
                            await checkGitHubRepo(pkg, owner, repo);
                        }
                    }
                } else if (ecosystem === 'pip') {
                    // For Python packages, we can try to get info from PyPI
                    const pypiResponse = await axios.get(`https://pypi.org/pypi/${pkg.name}/json`);
                    
                    if (pypiResponse.data.info) {
                        // Get latest version
                        if (pypiResponse.data.info.version) {
                            pkg.latestVersion = pypiResponse.data.info.version;
                            pkg.isOutdated = pkg.version !== pkg.latestVersion;
                        }
                        
                        // Check if there's a GitHub URL in project URLs
                        const projectUrls = pypiResponse.data.info.project_urls || {};
                        const githubUrl = Object.values(projectUrls).find(url => url.includes('github.com'));
                        
                        if (githubUrl) {
                            const match = githubUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
                            if (match) {
                                const [, owner, repo] = match;
                                await checkGitHubRepo(pkg, owner, repo);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error checking maintenance for ${pkg.name}:`, error.message);
                // Continue with the next package
            }
        }
        
        return packages;
    } catch (error) {
        console.error('Error checking maintenance:', error);
        throw new Error('Failed to check maintenance status');
    }
}

async function checkGitHubRepo(pkg, owner, repo) {
    try {
        // GitHub API has rate limits, so we might need authentication in a production app
        const commitsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
        
        if (commitsResponse.data && commitsResponse.data.length > 0) {
            const latestCommit = commitsResponse.data[0];
            const commitDate = new Date(latestCommit.commit.author.date);
            const now = new Date();
            const monthsDiff = (now.getFullYear() - commitDate.getFullYear()) * 12 + 
                              (now.getMonth() - commitDate.getMonth());
            
            pkg.maintenance = {
                repoUrl: `https://github.com/${owner}/${repo}`,
                lastCommit: commitDate.toISOString().split('T')[0],
                status: monthsDiff <= 6 ? 'active' : 'inactive'
            };
        }
    } catch (error) {
        console.error(`Error checking GitHub repo for ${pkg.name}:`, error.message);
        // Continue processing without GitHub data
    }
}

// API endpoint for checking dependencies
app.post('/api/check-dependencies', async (req, res) => {
    try {
        const { fileContent, fileType } = req.body;
        
        if (!fileContent || !fileType) {
            return res.status(400).json({ error: 'Missing file content or file type' });
        }
        
        // Parse dependencies based on file type
        let dependencies;
        if (fileType === 'npm') {
            dependencies = parsePackageJson(fileContent);
        } else if (fileType === 'pip') {
            dependencies = parseRequirementsTxt(fileContent);
        } else {
            return res.status(400).json({ error: 'Unsupported file type' });
        }
        
        // Check vulnerabilities
        const packagesWithVulnerabilities = await checkVulnerabilities(dependencies, fileType);
        
        // Check maintenance status
        const finalResults = await checkMaintenanceStatus(packagesWithVulnerabilities, fileType);
        
        res.json(finalResults);
    } catch (error) {
        console.error('Error processing dependencies:', error);
        res.status(500).json({ error: error.message || 'An error occurred while processing dependencies' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 