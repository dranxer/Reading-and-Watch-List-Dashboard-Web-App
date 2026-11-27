export default function SimplePage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>ReadWatch</h1>
      <p>Website is working!</p>
      <div style={{ marginTop: '2rem' }}>
        <a href="/sign-in" style={{ margin: '0 1rem', color: 'blue' }}>Sign In</a>
        <a href="/sign-up" style={{ margin: '0 1rem', color: 'blue' }}>Sign Up</a>
        <a href="/dashboard" style={{ margin: '0 1rem', color: 'blue' }}>Dashboard</a>
      </div>
    </main>
  );
} 