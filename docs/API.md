# 📡 Documentação da API

A API REST é servida em `http://localhost:3333` por padrão.  
A documentação interativa completa (Swagger UI) está disponível em `http://localhost:3333/docs`.

---

## Autenticação

A API utiliza sessões baseadas em **cookie** (`auth_session`) gerenciadas pela biblioteca **better-auth**.

| Endpoint | Método | Descrição |
|---|---|---|
| `/auth/auth/*` | GET / POST | Proxy para fluxos de login, logout e callback |

---

## Usuários

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/users` | GET | ✅ | Listar usuários cadastrados |

---

## Salas

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/rooms` | GET | ✅ | Listar todas as salas com bloco e estado da porta |
| `/rooms/summary` | GET | Opcional | Resumo de salas agrupadas por bloco (ver abaixo) |
| `/rooms/:id/profiles` | GET | ✅ | Listar perfis associados a uma sala |
| `/rooms/:id/profiles` | POST | ✅ | Atribuir perfil a uma sala |
| `/rooms/:id/users` | POST | ✅ | Conceder permissão direta de usuário a uma sala |
| `/rooms/:id/users/:userId` | DELETE | ✅ | Remover permissão direta de usuário de uma sala |

### `GET /rooms/summary`

Retorna todas as salas agrupadas por bloco com estado semântico (pt-BR) e, **quando autenticado**, informações de uso.

#### Comportamento por autenticação

| Campo | Anônimo | Autenticado |
|---|---|---|
| `block`, `rooms[*].id/name/typeName/state/lastStatusUpdateAt` | ✅ | ✅ |
| `rooms[*].currentUser` — usuário atualmente na sala | ❌ | ✅ |
| `rooms[*].lastUser` — último utilizador registrado | ❌ | ✅ |

#### Mapeamento de estado

| `doorState` (interno) | `isLocked` | Estado retornado |
|---|---|---|
| `OPEN` | `false` / `null` | `"aberta"` |
| `CLOSED` | qualquer | `"fechada"` |
| `OPEN` | `true` | `"alerta"` (porta aberta forçadamente) |
| `UNKNOWN` | qualquer | `"alerta"` |

#### Resposta `200 OK` (autenticado)

```json
{
  "authenticated": true,
  "result": [
    {
      "block": {
        "id": "1cf51c96-86a9-4fb3-b8e8-556a745d4423",
        "name": "Bloco A"
      },
      "rooms": [
        {
          "id": "cdea3efb-650d-4c8a-a9c0-8ee97d739f5c",
          "name": "Laboratório 101",
          "typeName": "Laboratório",
          "state": "aberta",
          "lastStatusUpdateAt": "2025-02-20T14:30:00.000Z",
          "currentUser": {
            "id": "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
            "name": "Ana Souza",
            "email": "ana.souza@ifsp.edu.br"
          },
          "lastUser": {
            "id": "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
            "name": "Ana Souza",
            "email": "ana.souza@ifsp.edu.br"
          }
        }
      ]
    }
  ]
}
```

#### Resposta `200 OK` (anônimo)

```json
{
  "authenticated": false,
  "result": [
    {
      "block": { "id": "...", "name": "Bloco A" },
      "rooms": [
        {
          "id": "...",
          "name": "Laboratório 101",
          "typeName": "Laboratório",
          "state": "fechada",
          "lastStatusUpdateAt": "2025-02-20T14:30:00.000Z"
        }
      ]
    }
  ]
}
```

---

## Tipos de Sala

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/room-types` | GET | ✅ | Listar tipos de sala |

---

## Portas / Controladores

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/doors` | GET | ✅ | Listar controladores de porta |

---

## Perfis

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/profiles` | GET | ✅ | Listar perfis |
| `/profiles` | POST | ✅ | Criar perfil |
| `/profiles/:id/users` | POST | ✅ | Atribuir usuário a um perfil |

---

## IoT

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| `/iot/*` | — | Interna | Endpoints de integração com o broker MQTT / ESP32 |
