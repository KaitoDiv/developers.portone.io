import {
  cache,
  redirect,
  type RouteDefinition,
  useLocation,
} from "@solidjs/router";
import { createMemo, createResource, type JSXElement, Show } from "solid-js";

import { NotFoundError } from "~/components/404";
import Metadata from "~/components/Metadata";
import * as prose from "~/components/prose";
import type { DocsEntry } from "~/content/config";
import DocsNavMenu from "~/layouts/sidebar/DocsNavMenu";
import RightSidebar from "~/layouts/sidebar/RightSidebar";
import { SearchProvider, SearchScreen } from "~/layouts/sidebar/search";
import { getFullSlug, loadDoc } from "~/misc/doc";
import { calcNavMenuSystemVersions } from "~/state/nav";
import { Lang } from "~/type";

const loadNavMenuSystemVersions = cache(async (lang: Lang) => {
  "use server";

  const { navMenu } = await import("~/state/server-only/nav");
  return calcNavMenuSystemVersions(navMenu[lang] || []);
}, "docs/nav-menu-system-versions");

export const route = {
  preload: ({ location }) => {
    const fullSlug = getFullSlug(location.pathname);
    if (!fullSlug) return;
    const lang = fullSlug.split("/")[0];

    void loadDoc(fullSlug);
    void loadNavMenuSystemVersions(lang as Lang);
  },
} satisfies RouteDefinition;

export default function Docs(props: { children: JSXElement }) {
  const location = useLocation();
  const fullSlug = createMemo(() => {
    const slug = getFullSlug(location.pathname);
    if (!slug) throw new NotFoundError();
    return slug;
  });
  const params = createMemo(() => {
    const [lang, slug] = fullSlug().split("/", 1) as [Lang, string];
    return { lang, slug };
  });
  const [doc] = createResource(fullSlug, (slug) => loadDoc(slug), {
    deferStream: true,
  });
  const [navMenuSystemVersions] = createResource(params, ({ lang }) =>
    loadNavMenuSystemVersions(lang),
  );

  return (
    <SearchProvider>
      <div class="flex">
        <DocsNavMenu lang={params().lang} slug={params().slug} />
        <div class="min-w-0 flex flex-1 justify-center">
          <Show when={doc()}>
            {(doc) => (
              <>
                <Metadata
                  title={doc().frontmatter.title}
                  description={doc().frontmatter.description}
                  ogType="article"
                  ogImageSlug={`docs/${params().lang}/${params().slug}.png`}
                  docsEntry={doc().frontmatter as DocsEntry}
                />
                <article class="m-4 mb-40 min-w-0 flex shrink-1 basis-200 flex-col text-slate-700">
                  <div class="mb-6">
                    <prose.h1 id="overview">{doc().frontmatter.title}</prose.h1>
                    <Show when={doc().frontmatter.description}>
                      <p class="my-4 text-xl text-gray">
                        {doc().frontmatter.description}
                      </p>
                    </Show>
                  </div>
                  {props.children}
                </article>
              </>
            )}
          </Show>
          <div class="hidden shrink-10 basis-10 lg:block"></div>
          <RightSidebar lang={params().lang} slug={params().slug} />
        </div>
      </div>
      <Show when={navMenuSystemVersions.latest}>
        {(versions) => (
          <SearchScreen
            lang={params().lang}
            navMenuSystemVersions={versions()}
          />
        )}
      </Show>
    </SearchProvider>
  );
}
