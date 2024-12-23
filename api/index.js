// Last updated: 9/18/2024

var express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();


/********************************************************************************** */
/*          create db for connecting to the database                                */
/********************************************************************************** */
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,   
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// connect to the database
db.connect((err) =>{
    if (err){
        console.log("Error connecting to database: ", err.message);
        return;
    }
    console.log("Connected to database.");
});


/********************************************************************************** */
/*          run basic queries on the database                                       */
/********************************************************************************** */
app.get('/get_lists', (req, res) => {
    try{
        const lists = db.query('SELECT * FROM todo_lists', (err, results) => {
            if (err) {
                console.error("API: Error querying database: ", err.message);
                return res.status(500).send("Error querying database.");
            }
            res.json(results);
        });
        return lists;
    } catch (err) {
        console.log("API: error retrieving lists: ", err.message);
    }
});

app.get('/get_items', (req, res) => {
    try{
        const items = db.query('SELECT * FROM todo_items', (err, results) => {
            if (err) {
                console.error("API: Error querying database: ", err.message);
                return res.status(500).send("Error querying database.");
            }
            res.json(results);
        });
        return items;
    } catch (err) {
        console.log("API: error retrieving items: ", err.message);
    }
});

/********************************************************************************** */
/*          get data function to render on the ui side                              */
/********************************************************************************** */
app.get('/get_data', (req, res) => {
    try{
        const query = `
            SELECT 
                todo_lists.name AS list_name,
                todo_items.name AS item_name,
                todo_items.completed
            FROM todo_lists
            LEFT JOIN todo_items ON todo_items.list_id = todo_lists.id
        `;
        
        const lists = db.query(query, (err, results) => {
            if (err) {
                console.error("API: Error querying database: ", err.message);
                return res.status(500).send("Error querying database.");
            }
            res.json(results);
        });
        return lists;
    } catch (err) {
        console.log("API: error retrieving data: ", err.message);
    }
});

/********************************************************************************** */
/*          helper functions                                                        */
/********************************************************************************** */
async function getListId(name) {
    const [results] = await db.promise().query("SELECT id FROM todo_lists WHERE name = ?", [name]);
    if (results.length === 0) {
        console.log(`API: List ${name} not found`);
        throw new Error(`List ${name} not found`);
    }
    return results[0].id;
}

/********************************************************************************** */
/*          add to the database                                                     */
/********************************************************************************** */
// pre: list_name and item_name
app.post('/add_item', async (req, res) => {
    const list_name = req.query.list_name; 
    const item_name = req.body.item_name;
    if(!list_name || !item_name){
        console.log("API: Missing list or item name.");
        return res.status(400).send("Missing list or item name.");
    }

    const list_id = await getListId(list_name);
    
    // check to see if the item already exists in the list
    db.query("SELECT id FROM todo_items WHERE name = ? AND list_id = ?",  [item_name, list_id], (err, results) => {
        if (err) {
            console.error("API: Error checking for duplicate item: ", err.message);
            return res.status(500).send("Error checking for duplicate item.");
        }
        if (results.length > 0) {
            console.log("API: Duplicate item name.");
            return res.status(400).send("An item with this description already exists in your list!");
        }

        // insert the new item into the items table
        db.query("INSERT INTO todo_items (list_id, name, completed) VALUES (?, ?, 0)", [list_id, item_name], (err, results) => {
            if (err) {
                console.error("API: Error inserting into database: ", err.message);
                return res.status(500).send("Error inserting into database.");
            }
            res.json("Added item successfully.");
        });
    })
})

// pre: list_name
app.post('/add_list', async (req, res) => {
    const list_name = req.body.list_name;
    if(!list_name){
        console.log("API: Missing list name.");
        return res.status(400).send("Missing list name.");
    }

    // check to see if the list already exists
    db.query("SELECT id FROM todo_lists WHERE name = ?", [list_name], (err, results) => {
        if (err) {
            console.error("API: Error checking for duplicate list: ", err.message);
            return res.status(500).send("Error checking for duplicate list.");
        }

        if (results.length > 0) {
            console.log("API: Duplicate list name.");
            return res.status(400).send("You already have a list with this name.");
        }

        // insert the new list into the list table
        const query = `INSERT INTO todo_lists (name) VALUES (?)`;
        db.query(query, [list_name], (err, results) => {
            if (err) {
                console.error("API: Error inserting into database: ", err.message);
                return res.status(500).send("Error inserting into database.");
            }
            res.json("Added list successfully.");
        });
    })
})

/********************************************************************************** */
/*          toggle item completion status                                           */
/********************************************************************************** */
// pre: list_name, item_name
app.post('/toggle_item', async (req, res) => {
    const list_name = req.body.list_name; 
    const item_name = req.body.item_name;
    if(!list_name || !item_name){
        console.log("API: Missing list or item name.");
        return res.status(400).send("Missing list or item name.");
    }

    const list_id = await getListId(list_name);
    
    
    // toggle the completion status of the item
    db.query("UPDATE todo_items SET completed = NOT completed WHERE name = ? AND list_id = ?", [item_name, list_id], (err, results) => {
        if (err) {
            console.error("API: Error toggling item in database: ", err.message);
            return res.status(500).send("Error toggling item in database.");
        }
        res.json("Toggled item successfully.");
    });
})


/********************************************************************************** */
/*          remove from the database                                                */
/********************************************************************************** */
// pre: list_name and item_name
app.delete('/delete_item', async (req, res) => {
    const list_name = req.body.list_name; 
    const item_name = req.body.item_name;
    if(!list_name || !item_name){
        console.log("API: Missing list or item name.");
        return res.status(400).send("Missing list or item name.");
    }

    const list_id = await getListId(list_name);

    // delete the item 
    const query = `DELETE FROM todo_items WHERE list_id = ? AND name = ?`;
    db.query(query, [list_id, item_name], (err, results) => {
        if (err) {
            console.error("API: Error deleting item from database: ", err.message);
            return res.status(500).send("Error deleting item from database.");
        }
        res.json("Deleted item successfully.");
    });
})

// pre: list_name
app.delete('/delete_list', async (req, res) => {
    const list_name = req.body.list_name;
    if(!list_name){
        console.log("API: Missing list name.");
        return res.status(400).send("Missing list name.");
    }

    // delete the list
    const query = `DELETE FROM todo_lists WHERE name = ?`;
    db.query(query, [list_name], (err, results) => {
        if (err) {
            console.error("API: Error deleting list from database: ", err.message);
            return res.status(500).send("Error deleting list from database.");
        }
        res.json("Deleted list successfully.");
    });
})



app.listen(3360, () => console.log("Server listening on port 3360."));

