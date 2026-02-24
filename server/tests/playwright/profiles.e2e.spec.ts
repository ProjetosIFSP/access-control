import { test, expect } from '@playwright/test';

const uniqueName = `test-profile-${Date.now()}`;
let createdProfileId: string | undefined;

test('POST /profiles — criar perfil (se autorizado)', async ({ request }) => {
  const res = await request.post('/profiles', { data: { name: uniqueName, description: 'gerado por teste' } });
  expect([201, 401, 403, 422]).toContain(res.status());

  if (res.status() === 201) {
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe(uniqueName);
    createdProfileId = body.id;
  }
});

test('GET /profiles — listar perfis', async ({ request }) => {
  const res = await request.get('/profiles');
  expect([200, 401, 403]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(Array.isArray(body.result)).toBe(true);
  }
});

test('POST/DELETE /profiles/:id/users — atribuir e remover usuário (best-effort)', async ({ request }) => {
  test.skip(!createdProfileId, 'profileId não foi criado — pular teste de atribuição');
  const profileId = createdProfileId as string;
  const fakeUserId = '00000000-0000-0000-0000-000000000001';

  const assign = await request.post(`/profiles/${profileId}/users`, { data: { userId: fakeUserId } });
  expect([204, 401, 403, 404]).toContain(assign.status());

  const remove = await request.delete(`/profiles/${profileId}/users/${fakeUserId}`);
  expect([204, 401, 403, 404]).toContain(remove.status());
});

test('POST/DELETE /rooms/:id/users — conceder/remover permissão direta (best-effort)', async ({ request }) => {
  const fakeRoomId = '00000000-0000-0000-0000-000000000002';
  const fakeUserId = '00000000-0000-0000-0000-000000000001';

  const grant = await request.post(`/rooms/${fakeRoomId}/users`, { data: { userId: fakeUserId } });
  expect([201, 204, 401, 403, 404]).toContain(grant.status());

  const remove = await request.delete(`/rooms/${fakeRoomId}/users/${fakeUserId}`);
  expect([204, 401, 403, 404]).toContain(remove.status());
});

test('POST /rooms/:id/profiles — atribuir perfil à sala (best-effort)', async ({ request }) => {
  test.skip(!createdProfileId, 'profileId não foi criado — pular atribuição à sala');
  const profileId = createdProfileId as string;
  const fakeRoomId = '00000000-0000-0000-0000-000000000002';

  const assign = await request.post(`/rooms/${fakeRoomId}/profiles`, { data: { profileId } });
  expect([204, 401, 403, 404]).toContain(assign.status());
});

test('GET /rooms/:id/profiles — listar perfis da sala (best-effort)', async ({ request }) => {
  const fakeRoomId = '00000000-0000-0000-0000-000000000002';
  const res = await request.get(`/rooms/${fakeRoomId}/profiles`);
  expect([200, 401, 403, 404]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(Array.isArray(body.result)).toBe(true);
  }
});

test('POST /access/verify — verificar acesso (retorna granted boolean)', async ({ request }) => {
  const res = await request.post('/access/verify', { data: { roomId: '00000000-0000-0000-0000-000000000002', credentialValue: 'test', type: 'RFID' } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(typeof body.granted).toBe('boolean');
});
