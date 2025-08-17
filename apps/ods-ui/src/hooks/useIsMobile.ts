import { em } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export const useIsMobile = () => useMediaQuery(`(max-width: ${em(750)})`);
