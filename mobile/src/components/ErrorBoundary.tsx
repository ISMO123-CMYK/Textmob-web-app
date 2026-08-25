import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.warn('[ErrorBoundary]', error, info);
  }
  reset = () => this.setState({ hasError: false, error: undefined });
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#09090b' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 48, paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={this.reset} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, marginTop: -48 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Something went wrong</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{this.state.error?.message || 'Unexpected error'}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={this.reset} style={{ backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={this.reset} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 12, textAlign: 'center' }}>Dismiss to continue to app</Text>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}
