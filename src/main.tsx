import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
);
