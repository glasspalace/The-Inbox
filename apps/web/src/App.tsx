import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { ValueSurveyPage } from "./pages/ValueSurveyPage";
import { SurveyResultsPage } from "./pages/SurveyResultsPage";
import { TopicPickerPage } from "./pages/TopicPickerPage";
import { QueueScreen } from "./features/matching/QueueScreen";
import { VideoRoomPage } from "./features/video/VideoRoomPage";
import { FeedbackPage } from "./pages/FeedbackPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/survey" element={<ValueSurveyPage />} />
        <Route path="/survey/complete" element={<SurveyResultsPage />} />
        <Route path="/topics" element={<TopicPickerPage />} />
        <Route path="/queue" element={<QueueScreen />} />
        <Route path="/room" element={<VideoRoomPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
