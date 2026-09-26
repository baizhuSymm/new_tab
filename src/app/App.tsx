import { useState } from 'react';
import { Settings } from 'lucide-react';
import { AppProvider } from './AppProvider';
import { Dialog } from '../ui/Dialog';
import { IconButton } from '../ui/IconButton';
export function App() { return <AppProvider><Shell /></AppProvider>; }
function Shell() { const [open, setOpen] = useState(false); return <main><IconButton label="设置" onClick={() => setOpen(true)}><Settings /></IconButton>{open && <Dialog title="设置" onClose={() => setOpen(false)}><p>本地偏好</p></Dialog>}</main>; }
