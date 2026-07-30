import { Suspense } from 'react';
import TopkaPostEditor from '../topka-post-editor';

export default function NewTopkaPostPage() {
    return (
        <Suspense fallback={<div className="text-white/50">Загрузка редактора...</div>}>
            <TopkaPostEditor />
        </Suspense>
    );
}
