import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const records = [
    ...await getCollection('patterns'),
    ...await getCollection('foundations'),
    ...await getCollection('styles'),
  ];
  return records.map((record) => ({ params: { id: record.data.id }, props: { record } }));
}

export const GET: APIRoute = ({ props }) => {
  const { record } = props;
  const source = record.collection === 'patterns'
    ? `/downloads/knowledge/patterns/${record.id}.md`
    : `/downloads/knowledge/${record.collection}/${record.data.id}.md`;
  return new Response(JSON.stringify({
    id: record.data.id,
    ...record.data,
    body: record.body,
    source,
    human: `/knowledge/${record.data.id}/`,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
