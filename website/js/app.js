// Main App Component
const App = () => {
    const [fileData, setFileData] = React.useState(null);
    const [fileName, setFileName] = React.useState('');
    const [fileType, setFileType] = React.useState('');
    const [results, setResults] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [filter, setFilter] = React.useState('all');
    
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
            const response = await fetch('/api/check-dependencies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileContent: fileData,
                    fileType
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to process dependencies');
            }
            
            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const downloadReport = () => {
        if (!results) return;
        
        const reportData = JSON.stringify(results, null, 2);
        const blob = new Blob([reportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Dependency Security Checker</h1>
                <p className="text-gray-600">Upload your dependency files to check for vulnerabilities and maintenance status</p>
            </header>
            
            <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden mb-8">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Dependencies File</h2>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select a package.json or requirements.txt file
                        </label>
                        <input 
                            type="file"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                    </div>
                    
                    {fileName && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-700">{fileName} ({fileType === 'npm' ? 'NPM Package' : 'Python Package'})</span>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                            {error}
                        </div>
                    )}
                    
                    <button
                        onClick={handleSubmit}
                        disabled={!fileData || loading}
                        className={`w-full py-2 px-4 rounded-md text-white font-medium 
                            ${!fileData || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : 'Check Dependencies'}
                    </button>
                </div>
            </div>
            
            {results && (
                <div className="max-w-5xl mx-auto bg-white shadow-md rounded-lg overflow-hidden mb-8">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Results</h2>
                            <div className="flex space-x-4">
                                <select 
                                    onChange={(e) => setFilter(e.target.value)}
                                    value={filter}
                                    className="block w-40 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Dependencies</option>
                                    <option value="vulnerable">Vulnerable</option>
                                    <option value="outdated">Outdated</option>
                                    <option value="unmaintained">Unmaintained</option>
                                </select>
                                <button
                                    onClick={downloadReport}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Report
                                </button>
                            </div>
                        </div>
                        
                        <div className="mb-6 flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px] p-4 bg-blue-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Dependencies</h3>
                                <p className="text-2xl font-bold text-blue-600">{results.length}</p>
                            </div>
                            <div className="flex-1 min-w-[200px] p-4 bg-red-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Vulnerabilities</h3>
                                <p className="text-2xl font-bold text-red-600">
                                    {results.filter(dep => dep.vulnerabilities && dep.vulnerabilities.length > 0).length}
                                </p>
                            </div>
                            <div className="flex-1 min-w-[200px] p-4 bg-yellow-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Outdated</h3>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {results.filter(dep => dep.isOutdated).length}
                                </p>
                            </div>
                            <div className="flex-1 min-w-[200px] p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Unmaintained</h3>
                                <p className="text-2xl font-bold text-gray-700">
                                    {results.filter(dep => dep.maintenance && dep.maintenance.status === 'inactive').length}
                                </p>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Package
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Version
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Vulnerabilities
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Maintenance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredResults.length > 0 ? (
                                        filteredResults.map((dep, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {dep.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {dep.version}
                                                    {dep.latestVersion && dep.version !== dep.latestVersion && (
                                                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                                            Latest: {dep.latestVersion}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                        ${dep.vulnerabilities && dep.vulnerabilities.length > 0 
                                                            ? 'bg-red-100 text-red-800' 
                                                            : dep.isOutdated 
                                                                ? 'bg-yellow-100 text-yellow-800' 
                                                                : 'bg-green-100 text-green-800'}`}
                                                    >
                                                        {dep.vulnerabilities && dep.vulnerabilities.length > 0 
                                                            ? 'Vulnerable' 
                                                            : dep.isOutdated 
                                                                ? 'Outdated' 
                                                                : 'Secure'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {dep.vulnerabilities && dep.vulnerabilities.length > 0 ? (
                                                        <div>
                                                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                                                {dep.vulnerabilities.length} Found
                                                            </span>
                                                            <ul className="mt-1 text-xs">
                                                                {dep.vulnerabilities.slice(0, 2).map((vuln, i) => (
                                                                    <li key={i} className="truncate max-w-xs">
                                                                        • {vuln.id}: {vuln.summary}
                                                                    </li>
                                                                ))}
                                                                {dep.vulnerabilities.length > 2 && (
                                                                    <li className="text-gray-400">
                                                                        + {dep.vulnerabilities.length - 2} more
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    ) : (
                                                        <span className="text-green-600">None found</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {dep.maintenance ? (
                                                        <div>
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                                                                ${dep.maintenance.status === 'active' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-gray-100 text-gray-800'}`}>
                                                                {dep.maintenance.status === 'active' ? 'Active' : 'Inactive'}
                                                            </span>
                                                            {dep.maintenance.lastCommit && (
                                                                <div className="text-xs mt-1">
                                                                    Last commit: {dep.maintenance.lastCommit}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">Unknown</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                                No results match the selected filter
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            <footer className="text-center text-gray-500 text-sm mt-12">
                <p>© {new Date().getFullYear()} Dependency Security Checker | Powered by OSV.dev & GitHub APIs</p>
            </footer>
        </div>
    );
};

// Render the App component
ReactDOM.render(<App />, document.getElementById('app')); 