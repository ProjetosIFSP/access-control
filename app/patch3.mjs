import fs from 'fs';
const p = 'app/src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

// 1. Add userRelationsQueryOptions to imports
code = code.replace(
/import \{ currentUserQueryOptions \} from "@\/services\/users";/,
`import { currentUserQueryOptions, userRelationsQueryOptions } from "@/services/users";`
);

// 2. Add relations query hook
code = code.replace(
/const \{ data: currentUser, refetch: refetchUser \} = useQuery\(currentUserQueryOptions\);/,
`const { data: currentUser, refetch: refetchUser } = useQuery(currentUserQueryOptions);\n\tconst { data: relations } = useQuery(userRelationsQueryOptions(session?.user?.id ?? null));`
);

// 3. Move and style the remove image button
code = code.replace(
/\{\/\* Avatar and Info Section \*\/\}\s*<div className="flex items-center gap-4">\s*<div className="flex flex-col items-center gap-2">\s*<div className="relative group cursor-pointer shrink-0">\s*<button/,
`{/* Avatar and Info Section */}
<div className="flex items-center gap-4">
<div className="flex flex-col items-center gap-2">
<div className="relative shrink-0">
<button`
);

code = code.replace(
/<\/div>\s*<\/button>\s*<\/div>\s*\{avatarPreview && !removedImage && \(\s*<button[\s\S]*?<\/button>\s*\)\}/,
`</div>
</button>
{avatarPreview && !removedImage && (
<button
type="button"
onClick={handleRemoveImage}
className="absolute -top-1 -right-1 z-10 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-sm"
title="Remover foto"
>
<X className="w-3.5 h-3.5" />
</button>
)}
</div>`
);

// 4. Update Badges
code = code.replace(
/\{isGoogleLinked && \(\s*<Badge\s*variant="secondary"\s*className="flex items-center gap-1"\s*>\s*<GoogleIcon className="w-3 h-3" \/> Google\s*Vinculado\s*<\/Badge>\s*\)\}/,
`{relations?.profiles.map((profile) => (
<Badge key={profile.id} variant="secondary">
{profile.name}
</Badge>
))}`
);

fs.writeFileSync(p, code);
