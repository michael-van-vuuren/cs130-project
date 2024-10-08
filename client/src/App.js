import React, { useContext } from "react";
import { MainContext } from "./MainContext"
import "./App.css";
import Tabs from './Tabs';

function App({ returningUser }) {
  const { login, setLogin } = useContext(MainContext);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "5px" }}>
        <button onClick={() => { setLogin(false) }}>
          Logout
        </button>
      </div>

      <div className="App">
        <Tabs returningUser={returningUser} />
      </div>
    </div>

  );
}

export default App;