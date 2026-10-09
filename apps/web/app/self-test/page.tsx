import type { Metadata } from "next";
import { SelfTest } from "../../components/self-test";

export const metadata: Metadata = {
  title: "Reading self-test",
  description: "Measure your own reading speed with and without reading anchors. Everything stays in your browser."
};

export default function SelfTestPage() {
  return (
    <div className="prose self-test-page">
      <h1>Reading self-test</h1>
      <p>
        Research has not found that anchors make people read faster on average, but people differ. This short test lets you compare your own
        reading with and without anchors. It takes about two minutes.
      </p>
      <SelfTest />
    </div>
  );
}
