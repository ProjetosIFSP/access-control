import fs from 'fs';
const p = 'app/src/routes/profile/index.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/const \[newPassword, setNewPassword\] = useState\(""\);\s+const \[confirmPassword, setConfirmPassword\] = useState\(""\);\s+const \[isLoadingInfo/,
`const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const fileInputRef = useRef<HTMLInputElement>(null);
const [isLoadingInfo`
);
fs.writeFileSync(p, code);
