import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const records = await getCollection('components');
  return records.map((record) => ({ params: { id: record.id }, props: { record } }));
}

export const GET: APIRoute = ({ props }) => {
  const { record } = props;
  return new Response(JSON.stringify({
    id: record.id,
    ...record.data,
    body: record.body,
    source: `/downloads/knowledge/components/${record.id}.md`,
    human: `/knowledge/${record.id}/`,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
