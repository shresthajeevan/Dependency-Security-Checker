// Debug script to help identify network issues
console.log('Debug script loaded');

// Test API connection
fetch('http://localhost:5000/api/health')
  .then(response => {
    console.log('API Health Check Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('API Health Check Response:', data);
  })
  .catch(error => {
    console.error('API Health Check Error:', error);
  });

// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch Request:', args[0], args[1] || {});
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch Response Status:', response.status, 'for', args[0]);
      return response;
    })
    .catch(error => {
      console.error('Fetch Error for', args[0], ':', error);
      throw error;
    });
}; 