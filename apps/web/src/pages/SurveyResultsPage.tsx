import { useNavigate } from "react-router-dom";
import { Button, Page } from "../components/ui";

export function SurveyResultsPage() {
  const navigate = useNavigate();

  return (
    <Page title="Signal / ready">
      <section className="ready-screen">
        <div className="ready-orb" aria-hidden="true" />
        <h1>You are calibrated.</h1>
        <p>
          The map is rough enough to be useful. Choose a topic and Parallax will open the airlock
          toward someone with a different read.
        </p>
        <Button onClick={() => navigate("/topics")}>Choose a topic</Button>
      </section>
    </Page>
  );
}
