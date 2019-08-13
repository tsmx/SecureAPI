const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ message: 'SecureAPI service is running...' });
});

app.listen(5000, () => { console.log('SecureAPI server running on port 5000') });