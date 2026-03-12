import { HeaderLogo } from "../header/header-logo";
import { Button } from "../ui/button";
import { Icon } from "@iconify/react";

const origin =
  typeof window !== "undefined"
    ? window.location
        .toString()
        .substring(0, window.location.toString().length - 5)
    : "http://localhost:";
export function Footer() {
  return (
    <footer className="overflow-hidden mt-auto flex flex-col-reverse md:flex-row gap-8 py-8 bg-white dark:bg-black px-4 sm:px-8 md:px-16 lg:px-32 transition-all">
      <section className="flex-1 flex flex-col gap-2">
        <HeaderLogo className="m-0! p-0! h-max! bg-transparent!" />

        <p className="text-xs  text-zinc-500 dark:text-zinc-400 leading-4 w-3/4">
          Desenvolvimento de ecossistema IoT para gerenciamento de acesso à
          ambientes com dispositivos de baixo custo e gerenciamento web
        </p>

        <span className="text-zinc-700 dark:text-zinc-300 text-sm flex pt-6">
          &copy; 2026&nbsp;&nbsp;&nbsp;●&nbsp;&nbsp;&nbsp;Desenvolvido por Abner
          J. Silva
        </span>

        {/* Social */}
        <div className="flex gap-2">
          {/* https://abnerjs.vercel.app/ */}
          <a
            href="https://abnerjs.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Website pessoal"
          >
            <Button
              variant="hover"
              className="rounded-xs! size-10 p-0"
              size="icon"
            >
              <Icon icon="streamline-plump:web" />
            </Button>
          </a>

          {/* https://www.linkedin.com/in/abner-j-silva/ */}
          <a
            href="https://www.linkedin.com/in/abner-j-silva/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <Button
              variant="hover"
              className="rounded-xs! size-10 p-0"
              overlayClassname="before:bg-[#0072b1]"
              size="icon"
            >
              <Icon icon="akar-icons:linkedin-fill" />
            </Button>
          </a>

          {/* https://github.com/abnerjs/ */}
          <a
            href="https://github.com/abnerjs/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <Button
              variant="hover"
              className="rounded-xs! size-10 p-0"
              size="icon"
              overlayClassname="before:bg-[#2b3137]"
            >
              <Icon icon="uim:github-alt" />
            </Button>
          </a>
        </div>
      </section>

      {/* Right Section */}
      <section className="flex-1 flex flex-col">
        {/* repo */}
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Código fonte:{" "}
          <Button variant="link" asChild>
            <a
              href="https://github.com/ProjetosIFSP/access-control"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/ProjetosIFSP/access-control
            </a>
          </Button>
        </span>

        {/* swagger */}
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Endpoints:{" "}
          <Button variant="link" asChild>
            <a
              href={`${origin}3333/docs`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {origin}3333/docs
            </a>
          </Button>
        </span>
      </section>
    </footer>
  );
}
