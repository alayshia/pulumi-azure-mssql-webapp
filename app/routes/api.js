const express = require('express');
const router = express.Router();
const sql = require('mssql');

// SQL connection configuration
const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
        encrypt: true 
    }
};

// Submits the question and answer
router.post('/submit', async (req, res) => {
    try {
        console.log("Submit request received:", req.body);

        let pool = await sql.connect(config);
        const { question, answer } = req.body;
        
        await pool.request()
            .input('question', sql.NVarChar, question)
            .input('answer', sql.NVarChar, answer)
            .query('INSERT INTO QuestionsAndAnswers (question, answer) VALUES (@question, @answer)');
        
        console.log("Answer submitted successfully.");
        res.json({ message: 'Answer submitted successfully' });
    } catch (err) {
        console.error("Error in /submit route:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Gets all questions and answers to be displayed
router.get('/questions', async (req, res) => {
    try {
        console.log("Get all questions request received");

        let pool = await sql.connect(config);
        const result = await pool.request().query('SELECT question, answer FROM QuestionsAndAnswers');
        
        console.log("Questions and answers fetched successfully.");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error in /questions route:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;