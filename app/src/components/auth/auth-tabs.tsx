import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@/components/animate-ui/components/radix/tabs";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

interface AuthTabsProps {
  onSuccess?: () => void;
}

export function AuthTabs({ onSuccess }: AuthTabsProps) {
  return (
    <Tabs defaultValue="login" className="w-full gap-3">
      <TabsList className="w-full">
        <TabsTrigger value="login" className="flex-1">
          Entrar
        </TabsTrigger>
        <TabsTrigger value="register" className="flex-1">
          Registrar
        </TabsTrigger>
      </TabsList>

      <TabsContents>
        <TabsContent value="login">
          <LoginForm onSuccess={onSuccess} />
        </TabsContent>
        <TabsContent value="register">
          <RegisterForm onSuccess={onSuccess} />
        </TabsContent>
      </TabsContents>
    </Tabs>
  );
}
