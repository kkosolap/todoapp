import './App.css';
import { Component } from 'react';
class App extends Component{

  constructor(props){
    super(props);
    this.state = {
      lists: [],
      new_list: '',
    };
  }

  API_URL="http://localhost:3360/";


  /********************************************************************************** */
  /*          refresh commands                                                        */
  /********************************************************************************** */
  async refresh_lists() {
    try {
        const response = await fetch(this.API_URL + "get_data");
        if (!response.ok) {
            throw new Error("Failed to fetch data.");
        }
        const data = await response.json(); 
        console.log("UI fetched data: ", data)

        // group the data
        const list_data = {};
        data.forEach((item) => {
            const list_name = item.list_name;
            if (!list_data[list_name]) {
                list_data[list_name] = [];
            }
            if (item.item_name !== null && item.completed !== null) {
              list_data[list_name].push({
                  name: item.item_name,
                  completed: item.completed,
              });
          }
        });

        console.log("UI list data: ", JSON.stringify(list_data));
        this.setState({ lists: list_data });
    } catch (error) {
        console.error("Error refreshing lists and items:", error);
    }
}


  componentDidMount(){
    this.refresh_lists();
  }

  /********************************************************************************** */
  /*          click commands                                                          */
  /********************************************************************************** */
  async add_item_click(list_name){
    const new_item = document.getElementById(`new_item_${list_name}`).value;
    if(!new_item){
      alert("Item name cannot be empty.");
      return;
    }
    
    const data = {
      item_name: new_item,
    };

    try {
      const response = await fetch(this.API_URL+`add_item?list_name=${list_name}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      this.refresh_lists();
      document.getElementById(`new_item_${list_name}`).value = '';
    } catch (error){
      console.error("UI: Error adding item: ", error);
      alert("Failed to add item.")
    }
  }

  async add_list_click(){
    const {new_list} = this.state;
    if(!new_list){
      alert("List name cannot be empty.");
      return;
    }
    
    const data = {
      list_name: new_list,
    };

    try {
      const response = await fetch(this.API_URL+"add_list", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      this.setState({new_list: ''});
      await this.refresh_lists();
    } catch (error){
      console.error("UI: Error creating list: ", error);
      alert("UI: Failed to create list.")
    }
  }
  
  async delete_item_click(list_name, item_name){
    const data = {
      list_name: list_name,
      item_name: item_name,
    };

    try{
      const response = await fetch(this.API_URL+"delete_item",{
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      this.refresh_lists();
    } catch (error) {
      console.error("UI: Error deleting item: ", error);
      alert("UI: Failed to delete item.")
    }
  }

  async delete_list_click(list_name){
    const data = {
      list_name: list_name,
    };

    console.log("Deleting list:", list_name);

    try{
      const response = await fetch(this.API_URL+"delete_list",{
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      this.refresh_lists();
    } catch (error) {
      console.error("UI: Error deleting list: ", error);
      alert("UI: Failed to delete list.")
    }
  }

  async toggle_item_status(list_name, item_name){
    const data = {
      list_name: list_name,
      item_name: item_name,
    };

    try {
      const response = await fetch(this.API_URL+"toggle_item", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      await this.refresh_lists();
    } catch (error){
      console.error("UI: Error toggling item: ", error);
      alert("UI: Failed to toggle item.")
    }
  }


  /********************************************************************************** */
  /*          css page rendering                                                      */
  /********************************************************************************** */
  render() {
    const{lists} = this.state;

    return (
      <div className="App" style={{ textAlign: 'left', marginLeft: "20px" }}>
        <h2 style={{ textAlign: 'center' }}>To-Do List WebApp</h2>
    
        <input
          id="new_list"
          type="text"
          placeholder="Create new list..."
          value={this.state.new_list}
          onChange={(e) => this.setState({ new_list: e.target.value })}
        />
        <button onClick={() => this.add_list_click()}>+</button>
    
        {Object.keys(lists).length > 0 ? (
          Object.keys(lists).map((list_name) => (
            <div key={list_name}>
              <h3>
                {list_name} 
                <button onClick={() => this.delete_list_click(list_name)}>Delete</button>
              </h3>
              
              <input
                id={`new_item_${list_name}`}
                type="text"
                placeholder="Add item to list..."
              />
              <button onClick={() => this.add_item_click(list_name)}>+</button>
    
              <ul>
                {lists[list_name].map((item, index) => (
                  <li key={index} style={{ listStyleType: "none" }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => this.toggle_item_status(list_name, item.name)}
                      />
                      {item.name} 
                    </label>
                    <button onClick={() => this.delete_item_click(list_name, item.name)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p>Create a list to get started!</p>
        )}
      </div>
    );    
  }
}


export default App;
