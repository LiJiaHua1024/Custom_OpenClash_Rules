# Personal OpenClash template

Use `cfg/Custom_Clash.ini` as the subscription conversion template. `cfg/Custom_Clash_Mainland.ini` is an identical compatibility copy. The upstream YAML and other templates do not inherit these personal settings.

The standard template keeps five region groups, combines unused media services into the manual group, routes Apple directly, and retains a selectable game download group. The Steam CDN rules precede that group and continue to route matching traffic directly. The Bing GeoSite routes through AI services; Gemini has its own selectable group.

Claude's explicit domain and Anthropic GeoSite rules precede all other template rules. The Claude selector lists all subscription nodes and defaults to `REJECT`; manually select a verified US node for a stable choice. Node names do not prove geographic location, and saved selections or node changes may affect the effective selection. The US group also has an explicit `REJECT` member to avoid the common subconverter empty-match fallback to `DIRECT`. GeoSite versions, external services, router bypass, IPv6, DNS, other devices, proxy failures, and the actual converter or core must be checked separately. This template does not guarantee account safety or prevent every possible direct connection. Test the generated configuration and actual traffic, including an empty US group and unavailable proxy, before use.

The template follows upstream by omitting `google-cn` direct routing. The upstream custom proxy provider is evaluated before general Google rules and may change independently. Check Google Play downloads, updates and the effective OpenClash bypass settings on the router after updating the subscription.

Domain rule providers use the upstream-maintained YAML variants: standard subconverter v0.9.0 does not set `format: mrs` when it emits providers for `.mrs` URLs. The upstream data and refresh intervals are still used.

The `Sync upstream` workflow fetches the upstream main branch daily or on manual dispatch. It merges only if Git reports no conflicts and the personal template checks pass; otherwise it fails without pushing. The checks cannot prove routing behavior, protect against every semantic change, or inspect the deployed router. The workflow requires Actions to be enabled and permission to push to this repository's main branch. When a merge is published, the upstream generation workflow refreshes derived rules and the Mainland copy. The upstream cache publisher is restricted to its original repository.
