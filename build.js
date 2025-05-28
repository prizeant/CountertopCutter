const fs = require('fs');
const path = require('path');

// Read the React component
const reactComponent = fs.readFileSync('src/CountertopOptimizer.jsx', 'utf8');

// Create the HTML template
const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Countertop Cutting Optimizer</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom icons using SVG data URLs */
        .icon-trash::before {
            content: "";
            display: inline-block;
            width: 1rem;
            height: 1rem;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23dc2626'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' /%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
        }
        .icon-plus::before {
            content: "";
            display: inline-block;
            width: 1rem;
            height: 1rem;
            margin-right: 0.25rem;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232563eb'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' /%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        ${reactComponent}
        
        // Render the component
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(CountertopOptimizer));
    </script>
</body>
</html>`;

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// Write the HTML file
fs.writeFileSync('dist/index.html', htmlTemplate);

console.log('✅ Build complete! Generated dist/index.html');
console.log('🚀 Ready for GitHub Pages deployment');
