const http = require('http');

http.get('http://localhost:5173', (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Content length: ${data.length}`);
    if (data.includes('<div id="root"></div>')) {
      console.log('✓ Root element found');
    } else {
      console.log('✗ Root element NOT found');
    }
    if (data.includes('src="/src/main.tsx"')) {
      console.log('✓ Main script found');
    } else {
      console.log('✗ Main script NOT found');
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
