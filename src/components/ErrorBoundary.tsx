import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px 24px',
          margin: '24px auto',
          maxWidth: '600px',
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            color: '#ef4444',
            marginBottom: '16px',
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-color, #1f2937)', marginBottom: '8px' }}>
            {this.props.fallbackTitle || 'Component Rendering Error'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)', marginBottom: '16px', lineHeight: '1.5' }}>
            A module component encountered an unexpected rendering exception. The rest of the application remains protected.
          </p>

          {this.state.error && (
            <div style={{
              backgroundColor: 'var(--bg-color, #f9fafb)',
              border: '1px solid var(--border-color, #e5e7eb)',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#ef4444',
              textAlign: 'left',
              marginBottom: '20px',
              overflowX: 'auto',
              maxHeight: '160px',
            }}>
              <strong>Error:</strong> {this.state.error.toString()}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', fontSize: '13px' }}
          >
            <RefreshCw size={14} /> Refresh Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
