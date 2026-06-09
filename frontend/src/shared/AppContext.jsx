// App context extracted from AgencyCRM.jsx
import { createContext, useContext } from "react";

const AppContext = createContext(null);

function useApp() {
  return useContext(AppContext);
}

export { AppContext, useApp };
