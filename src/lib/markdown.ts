export interface DerivedMarkdown {
  title: string;
  description: string;
  body: string;
  slug: string;
}

export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

export function slugify(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function stripFrontmatter(markdown: string) {
  return String(markdown || '').replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

export function stripMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[[^\]]+]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function deriveMarkdown(rawMarkdown: string, existingSlug = ''): DerivedMarkdown {
  const markdown = stripFrontmatter(rawMarkdown);

  if (!markdown) {
    throw new Error('Markdown is empty');
  }

  if (markdown.length > 250000) {
    throw new Error('Markdown is too large');
  }

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = stripMarkdown(titleMatch?.[1] || 'Untitled writeup').slice(0, 140);
  const body = titleMatch ? markdown.replace(titleMatch[0], '').trim() : markdown;
  const firstTextLine =
    body
      .split('\n')
      .map((line) => line.trim())
      .find(
        (line) =>
          line &&
          !line.startsWith('#') &&
          !line.startsWith('```') &&
          !line.startsWith('![') &&
          !line.startsWith('|'),
      ) || 'Writeup note.';

  return {
    title,
    description: stripMarkdown(firstTextLine).slice(0, 220) || 'Writeup note.',
    body,
    slug: slugify(existingSlug) || slugify(title),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

function safeUrl(value: string) {
  const url = value.trim();

  if (url.startsWith('/')) return url;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function renderInline(text: string) {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }

      if (part.startsWith('**') && part.endsWith('**')) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      }

      const link = part.match(/^\[([^\]]+)]\(([^)]+)\)$/);
      if (link) {
        const href = safeUrl(link[2]);
        if (!href) return escapeHtml(link[1]);
        const external = href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : '';
        return `<a href="${escapeHtml(href)}"${external}>${escapeHtml(link[1])}</a>`;
      }

      return escapeHtml(part);
    })
    .join('');
}

export function getMarkdownHeadings(markdown: string): Heading[] {
  return stripFrontmatter(markdown)
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = stripMarkdown(match[2]);
      return {
        depth: match[1].length,
        text,
        slug: slugify(text),
      };
    });
}

export function renderMarkdown(markdown: string) {
  const lines = stripFrontmatter(markdown).split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (image) {
      const src = safeUrl(image[2]);
      if (src) {
        const alt = escapeHtml(image[1]);
        const caption = image[1] ? `<figcaption>${alt}</figcaption>` : '';
        html.push(`<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" />${caption}</figure>`);
      }
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const depth = heading[1].length;
      const text = stripMarkdown(heading[2]);
      html.push(`<h${depth} id="${slugify(text)}">${renderInline(heading[2])}</h${depth}>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('- ')) {
        items.push(`<li>${renderInline(lines[index].trim().slice(2))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      html.push(`<blockquote>${renderInline(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (
        !current ||
        current.startsWith('```') ||
        current.startsWith('##') ||
        current.startsWith('- ') ||
        current.startsWith('> ') ||
        current.match(/^!\[([^\]]*)]\(([^)]+)\)$/)
      ) {
        break;
      }
      paragraphLines.push(current);
      index += 1;
    }

    html.push(`<p>${renderInline(paragraphLines.join(' '))}</p>`);
  }

  return html.join('\n');
}
