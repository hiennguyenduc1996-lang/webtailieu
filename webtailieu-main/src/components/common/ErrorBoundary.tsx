import * as React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.";
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Bạn không có quyền thực hiện hành động này. Vui lòng kiểm tra đăng nhập hoặc liên hệ quản trị viên.";
          }
        }
      } catch (e) {
        if (this.state.error?.message.includes('permission-denied')) {
            errorMessage = "Lỗi quyền truy cập cơ sở dữ liệu.";
        }
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="bg-destructive/10 p-3 rounded-full">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Rất tiếc!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {errorMessage}
          </p>
          <Button onClick={this.handleReset} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Tải lại trang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
