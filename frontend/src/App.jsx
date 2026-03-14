import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading)
    return (
      <div style={{
        minHeight: "100vh",
        background: theme.bgPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ color: theme.textTertiary, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
          Loading...
        </span>
      </div>
    );

  return user ? <Dashboard user={user} /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}