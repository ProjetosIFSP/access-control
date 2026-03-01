import { useLayoutEffect, useState, useRef } from "react";

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useLayoutEffect(() => {
    const updateSize = (): void => {
      setIsMobile(window.innerWidth < 768);
    };

    const debouncedResize = (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(updateSize, 250);
    };

    updateSize();
    window.addEventListener("resize", debouncedResize);

    return (): void => {
      window.removeEventListener("resize", debouncedResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return isMobile;
};

export default useIsMobile;
