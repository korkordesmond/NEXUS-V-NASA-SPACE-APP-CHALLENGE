import { MissionProvider } from "./state/MissionContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import Plan from "./pages/Plan";
import Build from "./pages/Build";
import Launch from "./pages/Launch";
import Feedback from "./pages/Feedback";

export default function App() {
  return (
    <MissionProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/team" element={<CreateTeam />} />
          
          {/* The invite link route! */}
          <Route path="/join/:code" element={<JoinTeam />} />
          
          {/* Mission Routes wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="/plan" element={<Plan />} />
            <Route path="/build" element={<Build />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/feedback" element={<Feedback />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MissionProvider>
  );
}