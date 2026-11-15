/** Browser entry point: connect the HTML mount element to the React component tree. */
import { createRoot } from 'react-dom/client';
import App from './App';
// Import global CSS once; Vite bundles it into the production output.
import './styles.css';
// index.html supplies #root. The ! is a TypeScript non-null assertion about that
// known HTML contract; it does not perform a runtime check or create the element.
createRoot(document.getElementById('root')!).render(<App />);
