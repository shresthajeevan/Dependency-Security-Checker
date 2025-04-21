// API endpoint base URL
const API_BASE_URL = 'http://localhost:5000/api';

console.log('App.js loaded');
console.log('React available:', typeof React !== 'undefined');
console.log('ReactDOM available:', typeof ReactDOM !== 'undefined');
// Log ReactDOM version info if available
if (typeof ReactDOM !== 'undefined') {
    console.log('ReactDOM version:', ReactDOM.version);
}

// Main App Component
const App = () => {
    console.log('App component rendering');
    const [fileData, setFileData] = React.useState(null);
    const [fileName, setFileName] = React.useState('');
    const [fileType, setFileType] = React.useState('');
    const [results, setResults] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [filter, setFilter] = React.useState('all');
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 10;
    
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                setFileData(content);
                setFileName(file.name);
                
                if (file.name.includes('package.json')) {
                    setFileType('npm');
                } else if (file.name.includes('requirements.txt')) {
                    setFileType('pip');
                } else {
                    throw new Error('Unsupported file type. Please upload package.json or requirements.txt');
                }
                
                setError(null);
            } catch (err) {
                setError(err.message);
            }
        };
        reader.readAsText(file);
    };
    
    const handleSubmit = async () => {
        if (!fileData) {
            setError('Please upload a file first');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(`${API_BASE_URL}/check-dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileContent: fileData, fileType }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Failed to process dependencies');
            
            const data = await response.json();
            setCurrentPage(1);
            setResults(data);
        } catch (err) {
            setError(err.name === 'AbortError' 
                ? 'Request timed out. The server might be busy or the file is too large.' 
                : err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const downloadReport = () => {
        if (!results) return;
        
        try {
            const categories = {
                vulnerable: { title: 'Vulnerable Dependencies', className: 'section-red' },
                outdated: { title: 'Outdated Dependencies', className: 'section-yellow' },
                unmaintained: { title: 'Unmaintained Dependencies', className: 'section-gray' },
                secure: { title: 'Secure Dependencies', className: 'section-green' }
            };
            
            const classifyDep = (dep) => {
                if (dep.vulnerabilities && dep.vulnerabilities.length > 0) return 'vulnerable';
                else if (dep.isOutdated) return 'outdated';
                else if (dep.maintenance && dep.maintenance.status === 'inactive') return 'unmaintained';
                else return 'secure';
            };
            
            const counts = { vulnerable: 0, outdated: 0, unmaintained: 0, secure: 0 };
            results.forEach(dep => counts[classifyDep(dep)]++);
            
            const htmlContent = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Dependencies Report</title>
                <style>
                    body{font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#333;margin:0;padding:20px}
                    h1,h2{color:#2d3748}
                    .container{max-width:1000px;margin:0 auto}
                    .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:1px solid #e2e8f0}
                    .summary{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:30px}
                    .summary-card{flex:1;min-width:120px;padding:15px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
                    .card-title{font-size:14px;font-weight:500;margin-bottom:5px;color:#718096}
                    .card-value{font-size:24px;font-weight:700}
                    .blue{background-color:#ebf8ff;color:#3182ce}
                    .red{background-color:#fff5f5;color:#e53e3e}
                    .yellow{background-color:#fffff0;color:#d69e2e}
                    .gray{background-color:#f7fafc;color:#4a5568}
                    .green{background-color:#f0fff4;color:#38a169}
                    table{width:100%;border-collapse:collapse;margin-bottom:20px}
                    th{background-color:#f7fafc;font-size:12px;font-weight:600;color:#718096;text-align:left;padding:12px;border-bottom:1px solid #e2e8f0}
                    td{padding:12px;border-top:1px solid #e2e8f0;font-size:14px}
                    tr:nth-child(even){background-color:#f7fafc}
                    .badge{display:inline-block;padding:3px 6px;border-radius:9999px;font-size:12px;font-weight:500}
                    .badge-red{background-color:#fff5f5;color:#e53e3e}
                    .badge-yellow{background-color:#fffff0;color:#d69e2e}
                    .badge-green{background-color:#f0fff4;color:#38a169}
                    .badge-gray{background-color:#f7fafc;color:#4a5568}
                    .section{margin-bottom:30px;padding:20px;border-radius:8px}
                    .section-title{border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:20px}
                    .section-red{background-color:#fff5f5}
                    .section-yellow{background-color:#fffff0}
                    .section-gray{background-color:#f7fafc}
                    .section-green{background-color:#f0fff4}
                    .footer{text-align:center;margin-top:40px;font-size:14px;color:#718096;padding-top:20px;border-top:1px solid #e2e8f0}
                    .print-button{display:block;margin:20px auto;padding:10px 20px;background-color:#4299e1;color:white;border:none;border-radius:4px;cursor:pointer}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Dependency Security Report</h1>
                        <p>Generated on ${new Date().toLocaleDateString()} for ${fileName}</p>
                        <button class="print-button" onclick="window.print()">Print Report</button>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-card blue">
                            <div class="card-title">Total Dependencies</div>
                            <div class="card-value">${results.length}</div>
                        </div>
                        <div class="summary-card red">
                            <div class="card-title">Vulnerabilities</div>
                            <div class="card-value">${counts.vulnerable}</div>
                        </div>
                        <div class="summary-card yellow">
                            <div class="card-title">Outdated</div>
                            <div class="card-value">${counts.outdated}</div>
                        </div>
                        <div class="summary-card gray">
                            <div class="card-title">Unmaintained</div>
                            <div class="card-value">${counts.unmaintained}</div>
                        </div>
                        <div class="summary-card green">
                            <div class="card-title">Secure</div>
                            <div class="card-value">${counts.secure}</div>
                        </div>
                    </div>
                    
                    ${Object.entries(categories).map(([type, info]) => {
                        if (counts[type] === 0) return '';
                        
                        const deps = results.filter(dep => classifyDep(dep) === type);
                        return `
                        <div class="section ${info.className}">
                            <h2 class="section-title">${info.title} (${counts[type]})</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Package</th>
                                        <th>Current Version</th>
                                        <th>Latest Version</th>
                                        ${type === 'vulnerable' ? '<th>Vulnerabilities</th><th>Severity</th>' : ''}
                                        ${type === 'outdated' ? '<th>Action</th>' : ''}
                                        ${type === 'unmaintained' ? '<th>Status</th><th>Recommendation</th>' : ''}
                                        ${type === 'secure' ? '<th>Status</th>' : ''}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${deps.map(dep => {
                                        if (type === 'vulnerable') {
                                            const highestSeverity = dep.vulnerabilities.reduce((highest, vuln) => {
                                                const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'unknown': 0 };
                                                return severityOrder[vuln.severity] > severityOrder[highest] ? vuln.severity : highest;
                                            }, 'unknown');
                                            
                                            const severityClass = {
                                                'critical': 'badge-red',
                                                'high': 'badge-red',
                                                'medium': 'badge-yellow',
                                                'low': 'badge-green',
                                                'unknown': 'badge-gray'
                                            }[highestSeverity];
                                            
                                            return `
                                            <tr>
                                                <td><strong>${dep.name}</strong></td>
                                                <td>${dep.version}</td>
                                                <td>${dep.latestVersion || 'Unknown'}</td>
                                                <td>${dep.vulnerabilities.length}</td>
                                                <td><span class="badge ${severityClass}">${highestSeverity}</span></td>
                                            </tr>`;
                                        } else if (type === 'outdated') {
                                            return `
                                            <tr>
                                                <td><strong>${dep.name}</strong></td>
                                                <td>${dep.version}</td>
                                                <td>${dep.latestVersion || 'Unknown'}</td>
                                                <td>Update to latest version</td>
                                            </tr>`;
                                        } else if (type === 'unmaintained') {
                                            return `
                                            <tr>
                                                <td><strong>${dep.name}</strong></td>
                                                <td>${dep.version}</td>
                                                <td>Inactive</td>
                                                <td>Consider alternative package</td>
                                            </tr>`;
                                        } else {
                                            return `
                                            <tr>
                                                <td><strong>${dep.name}</strong></td>
                                                <td>${dep.version}</td>
                                                <td><span class="badge badge-green">Secure</span></td>
                                            </tr>`;
                                        }
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>`;
                    }).join('')}
                    
                </div>
            </body>
            </html>`;
            
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dependency-report-${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report: ' + error.message);
        }
    };
    
    const filterResults = () => {
        if (!results) return [];
        
        switch (filter) {
            case 'vulnerable':
                return results.filter(dep => dep.vulnerabilities && dep.vulnerabilities.length > 0);
            case 'outdated':
                return results.filter(dep => dep.isOutdated);
            case 'unmaintained':
                return results.filter(dep => dep.maintenance && dep.maintenance.status === 'inactive');
            default:
                return results;
        }
    };
    
    const filteredResults = results ? filterResults() : [];
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedResults = filteredResults.slice(startIndex, startIndex + itemsPerPage);
    
    const goToPage = (page) => {
        setCurrentPage(page);
        const resultsTable = document.querySelector('.results-table');
        if (resultsTable) resultsTable.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
               
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* File Upload Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <div className="bg-blue-50 rounded-full p-2 mr-3">
                                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Upload Dependencies File</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select a package.json or requirements.txt file
                                    </label>
                                    <div 
                                        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-300 border-dashed rounded-lg hover:border-brand-500 transition-colors cursor-pointer"
                                        onClick={() => document.getElementById('file-upload').click()}
                                    >
                                        <input
                                            id="file-upload"
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                        <div className="space-y-1 text-center">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600">
                                                <span className="font-medium text-brand-600 hover:text-brand-500">
                                                    Upload a file
                                                </span>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">package.json or requirements.txt up to 10MB</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {fileName && (
                                    <div className="flex items-center p-3 bg-brand-50 rounded-lg">
                                        <svg className="h-5 w-5 text-brand-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-brand-900 truncate">{fileName}</p>
                                            <p className="text-xs text-brand-600">{fileType === 'npm' ? 'NPM Package' : 'Python Package'}</p>
                                        </div>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="rounded-md bg-red-50 p-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-red-800">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <button
                                    onClick={handleSubmit}
                                    disabled={!fileData || loading}
                                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                        ${!fileData || loading 
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : 'bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500'}`}
                                >
                                    {loading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : 'Analyze Dependencies'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Information Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <div className="bg-green-50 rounded-full p-2 mr-3">
                                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Security Features</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-50">
                                            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-sm font-medium text-gray-900">Vulnerability Detection</h3>
                                        <p className="mt-1 text-sm text-gray-500">Identify known security vulnerabilities in your project dependencies using the latest vulnerability databases.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-green-50">
                                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-sm font-medium text-gray-900">Update Detection</h3>
                                        <p className="mt-1 text-sm text-gray-500">Get notified about outdated packages and receive recommendations for the latest secure versions.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-yellow-50">
                                            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-sm font-medium text-gray-900">Maintenance Status</h3>
                                        <p className="mt-1 text-sm text-gray-500">Identify unmaintained packages that could pose future security risks to your project.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                {results && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-24">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Scan Results</h2>
                                <button 
                                    onClick={() => setResults(null)} 
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-wrap justify-between items-center mb-6">
                                <div className="flex space-x-3">
                                    <select 
                                        onChange={(e) => {
                                            setFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        value={filter}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    >
                                        <option value="all">All Dependencies</option>
                                        <option value="vulnerable">Vulnerable</option>
                                        <option value="outdated">Outdated</option>
                                        <option value="unmaintained">Unmaintained</option>
                                    </select>
                                    <button
                                        onClick={downloadReport}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Report
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-blue-600">Total</div>
                                    <div className="mt-1 text-2xl font-semibold text-blue-900">{results.length}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-red-600">Vulnerable</div>
                                    <div className="mt-1 text-2xl font-semibold text-red-900">
                                        {results.filter(dep => dep.vulnerabilities && dep.vulnerabilities.length > 0).length}
                                    </div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-yellow-600">Outdated</div>
                                    <div className="mt-1 text-2xl font-semibold text-yellow-900">
                                        {results.filter(dep => dep.isOutdated).length}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-sm font-medium text-gray-600">Unmaintained</div>
                                    <div className="mt-1 text-2xl font-semibold text-gray-900">
                                        {results.filter(dep => dep.maintenance && dep.maintenance.status === 'inactive').length}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedResults.map((dep, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dep.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {dep.version}
                                                    {dep.latestVersion && dep.version !== dep.latestVersion && (
                                                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                            → {dep.latestVersion}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full
                                                        ${dep.vulnerabilities && dep.vulnerabilities.length > 0 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : dep.isOutdated 
                                                                ? 'bg-yellow-100 text-yellow-800' 
                                                                : dep.maintenance && dep.maintenance.status === 'inactive'
                                                                    ? 'bg-gray-100 text-gray-800'
                                                                    : 'bg-green-100 text-green-800'}`}
                                                    >
                                                        {dep.vulnerabilities && dep.vulnerabilities.length > 0 
                                                            ? 'Vulnerable' 
                                                            : dep.isOutdated 
                                                                ? 'Outdated' 
                                                                : dep.maintenance && dep.maintenance.status === 'inactive'
                                                                    ? 'Unmaintained'
                                                                    : 'Secure'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {dep.vulnerabilities && dep.vulnerabilities.length > 0 ? (
                                                        <span className="text-red-600">{dep.vulnerabilities.length} vulnerabilities</span>
                                                    ) : dep.isOutdated ? (
                                                        <span className="text-yellow-600">Update recommended</span>
                                                    ) : dep.maintenance && dep.maintenance.status === 'inactive' ? (
                                                        <span className="text-gray-600">Consider alternatives</span>
                                                    ) : (
                                                        <span className="text-green-600">No issues found</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredResults.length > itemsPerPage && (
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="text-sm text-gray-700">
                                        Showing {Math.min(startIndex + 1, filteredResults.length)} to {Math.min(startIndex + itemsPerPage, filteredResults.length)} of {filteredResults.length}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className={`px-3 py-1 rounded-md text-sm font-medium
                                                ${currentPage === 1 
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className={`px-3 py-1 rounded-md text-sm font-medium
                                                ${currentPage === totalPages 
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
          
        </div>
    );
};

// Render the App component
const container = document.getElementById('app');
ReactDOM.render(<App />, container); 