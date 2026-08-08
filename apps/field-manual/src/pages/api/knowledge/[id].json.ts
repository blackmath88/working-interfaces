import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const records = await getCollection('patterns');
  return records.map((record) => ({ params: { id: record.data.id }, props: { record } }));
}

export const GET: APIRoute = ({ props }) => {
  const { record } = props;
  return new Response(JSON.stringify({
    id: record.data.id,
    ...record.data,
    body: record.body,
    source: `/downloads/knowledge/patterns/provenance/${record.id}.md`,
    human: `/knowledge/${record.data.id}/`,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
