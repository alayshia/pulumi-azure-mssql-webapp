const express = require('express');
const path = require('path');
const sql = require('mssql');
const app = express();
const apiRoutes = require('./routes/api');

// Server.js is a backend that verifies the SQL connection (good for local development). It has an api express simple backend and a js frontend. The 
// frontend serves files from the public folder

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

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Creates a table if it does not exists
async function createTableIfNotExists() {
    try {
        let pool = await sql.connect(config);
        const tableCheckQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'QuestionsAndAnswers')
            BEGIN
                CREATE TABLE QuestionsAndAnswers (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    question NVARCHAR(255),
                    answer NVARCHAR(255)
                );
            END
        `;
        await pool.request().query(tableCheckQuery);
        console.log("Table 'QuestionsAndAnswers' is ready.");
    } catch (err) {
        console.error("Error creating table:", err.message);
        process.exit(1);  // Exit if table creation fails
    }
}

// Test SQL connection and create the table on server startup
(async function testSqlConnection() {
    try {
        console.log("Testing MSSQL connection...");
        console.log(`SQL Server: ${config.server}`);
        console.log(`SQL Database: ${config.database}`);

        const pool = await sql.connect(config);
        console.log("Connected to MSSQL successfully.");

        await createTableIfNotExists();
    } catch (err) {
        console.error("Error connecting to MSSQL:", err.message);
        process.exit(1);  
    }
})();

// API routes for handling question and answer submission and retrieval
app.use('/api', apiRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});