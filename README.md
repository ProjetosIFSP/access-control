# 🔒 Controle de Acesso - TCC
<p align="center">
<em>
Um sistema completo de controle de acesso com fechadura eletrônica (ESP32), comunicação em tempo real (MQTT) e uma interface web moderna para gerenciamento.
</em>
</p>

****

## ✨ Visão Geral
Este projeto é um Trabalho de Conclusão de Curso que visa criar um sistema de controle de acesso robusto e moderno. A arquitetura é dividida em três componentes principais:

- **IoT**: Uma fechadura eletrônica desenvolvida com um microcontrolador ESP32.
- **Comunicação**: Um broker MQTT para comunicação em tempo real, segura e eficiente entre o hardware e o servidor.
- **Software**: Uma aplicação web para visualização, cadastro de digitais e gerenciamento, com um backend que centraliza a lógica de negócio.

# 📂 Estrutura do Repositório
O projeto é organizado em um monorepo com os seguintes diretórios principais:

- `📁 /server`: Contém a API REST em Node.js com Fastify e Drizzle ORM. É o cérebro da aplicação, gerenciando os dados e a lógica de negócio.

- `📁 /web`: Contém a aplicação frontend em React (Vite). É a interface com o usuário para visualizar dados, cadastrar digitais, etc.

- `📁 /iot`: Contém o broker MQTT customizado (Node.js + Aedes) e a documentação para integração com os dispositivos ESP32.

## 🛠️ Desenvolvimento com Workspaces

Este repositório usa **npm workspaces** para gerenciar as dependências dos pacotes `app`, `server` e `iot` a partir da raiz.

- Instale tudo de uma vez: `npm install --workspaces`
- Rodar scripts específicos (exemplos):
	- Frontend: `npm run dev:app`
	- Backend: `npm run dev:server`
	- Broker MQTT: `npm run dev:iot`
- Build completo: `npm run build`

## 🎨 Design

Aqui você pode encontrar informações sobre o protótipo e o guia de estilos.
[↗️ Abrir protótipo no Figma](https://www.figma.com/design/8GcnhoimUUw2dgOL8HUtlE/Controle-de-Acesso?node-id=4003-2094&t=ODmc5wd0JM3k3qeM-1)

## ☁️ Deploy
As instruções detalhadas para realizar o deploy da aplicação em um ambiente de produção estão localizadas na documentação.

➡️ Leia o [Guia de Deploy](/docs/README.md)