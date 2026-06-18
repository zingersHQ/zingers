export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-render-root style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0a0812" }}>
      {children}
    </div>
  );
}
