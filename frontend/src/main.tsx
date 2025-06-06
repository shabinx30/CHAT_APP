import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store.ts";
import "./index.css";
import App from "./App.tsx";
import AppProvider from "./context/AppContext.tsx";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <Provider store={store}>
            <AppProvider>
                <App />
            </AppProvider>
        </Provider>
    </BrowserRouter>
);
