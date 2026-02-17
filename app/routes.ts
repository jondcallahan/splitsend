import { index, route } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
  index("routes/home.tsx"),
  route("g/:slug/admin/:adminToken", "routes/admin.tsx"),
  route("g/:slug/m/:memberToken", "routes/member.tsx"),
] satisfies RouteConfig;
