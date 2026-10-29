import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <main className="app-shell">
        <div className="empty-detail" role="alert">
          <h1>This page could not be displayed</h1>
          <p>Reload GradFlow to return to your workspace. Your saved work is safe.</p>
          <button className="button button-primary mt-4" onClick={() => window.location.reload()}>Reload GradFlow</button>
        </div>
      </main>
    );
    return this.props.children;
  }
}
