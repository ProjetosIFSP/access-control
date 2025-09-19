# Controle de Acesso - TCC

Este repositório visa o armazenamento de códigos de desenvolvimento de um sistema de controle de acesso que utiliza do desenvolvimento de uma fechadura eletrônica com microcontrolador o qual se comunica via MQTT com o servidor e este tem um cliente frontend para visualização e personalização dos dados.

## 🚀 Deploy
Informações sobre deploy em: `/docs/README.md`

## Conteúdo
Tecnologias utilizadas para a construção do deste trabalho de conclusão de curso.

#### IoT
Esta parte fala da comunicação dos microcontroladores, todos os endpoints de protocolo MQTT estarão por aqui.

>Para mais informações, verifique o README.md dentro de `/iot`

#### Web
É armazenado a base de código **React** que obtêm os dados das fechaduras, cadastra digitais e se comunica diretamente com o usuário.

>Para mais informações, verifique o README.md dentro de `/web`

#### Server
Utilizado pelo _front-end_, armazena todos os _endpoints_ da aplicação _web_ por meio de uma API REST **Node.js** com **Fastify** e **Drizzle ORM**.

>Para mais informações, verifique o README.md dentro de `/server`

## 💻 Figma

Aqui você pode encontrar informações sobre o protótipo e o guia de estilos.
[Abrir protótipo no Figma](https://www.figma.com/design/8GcnhoimUUw2dgOL8HUtlE/Controle-de-Acesso?node-id=4003-2094&t=ODmc5wd0JM3k3qeM-1)