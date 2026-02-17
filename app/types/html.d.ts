import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    commandfor?: string;
    command?: string;
    closedby?: string;
  }
}
