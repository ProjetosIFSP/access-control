import fs from 'fs';
const p = '/home/abner/Documentos/IFSP/tcc/app/src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

// The tricky part might be indentation, we'll use a regex replacement with dotAll
code = code.replace(
/\{\/\* Avatar and Info Section \*\/\}\s*<div className="flex items-center gap-4">\s*<div className="flex flex-col items-center gap-2">\s*<div className="relative group cursor-pointer shrink-0">\s*<button[\s\S]*?<Camera className="w-6 h-6 md:w-8 md:h-8 text-white" \/>\s*<\/div>\s*<\/button>\s*<\/div>\s*(?:\{avatarPreview && !removedImage && \([\s\S]*?<\/button>\s*\)\})?\s*<\/div>/,
`{/* Avatar and Info Section */}
<div className="flex items-center gap-4">
<div className="flex flex-col items-center gap-2">
<div className="relative group cursor-pointer shrink-0">
<button
type="button"
onClick={() => fileInputRef.current?.click()}
className="cursor-pointer group"
>
<Avatar
size="lg"
className={cn(
"w-20! h-20! sm:w-24! sm:h-24! md:w-32! md:h-32! transition-all group-hover:brightness-50",
removedImage && "grayscale",
)}
>
<AvatarImage
src={avatarPreview || session.user.image || undefined}
/>
<AvatarFallback>
{session.user.name?.charAt(0)?.toUpperCase() ||
session.user.email?.charAt(0)?.toUpperCase()}
</AvatarFallback>
</Avatar>
<div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
<Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
</div>
</button>
{avatarPreview && !removedImage && (
<button
type="button"
onClick={handleRemoveImage}
className="absolute flex items-center justify-center p-1 w-6 h-6 sm:w-8 sm:h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full right-0 top-0 transition-colors z-10 shadow-sm border border-red-200"
title="Remover foto"
>
<X className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
</button>
)}
</div>
</div>`
);

fs.writeFileSync(p, code);
