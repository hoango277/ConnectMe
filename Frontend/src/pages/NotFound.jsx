import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="max-w-md w-full p-8 bg-background rounded-lg shadow-lg text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
        <p className="text-muted-foreground mt-2">The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound
