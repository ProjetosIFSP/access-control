	
**INSTITUTO FEDERAL DE EDUCAÇÃO, CIÊNCIA E TECNOLOGIA DE SÃO PAULO**  
**Campus Presidente Epitácio**

Bacharelado em Ciência da Computação

Trabalho de Conclusão de Curso

**Desenvolvimento de ecossistema IoT para gerenciamento de acesso a ambientes com dispositivos de baixo custo e gerenciamento web**

Abner José da Silva

**Presidente Epitácio-SP**

**2024**

Desenvolvimento de ecossistema IoT para gerenciamento de acesso à ambientes com dispositivos de baixo custo e gerenciamento web

Trabalho de Conclusão de Curso apresentado à banca examinadora do Instituto Federal de Educação, Ciência e Tecnologia de São Paulo \- Campus Presidente Epitácio – Curso de Bacharelado em Ciência da Computação, como requisito parcial à obtenção do grau de Bacharel em Ciência da Computação sob a orientação do professor Dr. André Luis Olivete.

#### **Dedicatória**

*Dedico este trabalho, resumidamente, à você leitor. Pois sei que fez parte da minha vida em algum momento, seja como apoio, orientação, incentivo ou conhecimento compartilhado.*

#### **agradecimentos**

Agradeço ao Instituto Federal de Educação, Ciência e Tecnologia, Campus Presidente Epitácio pela oportunidade estudar em um curso de ensino superior de qualidade, que foi fundamental ao meu processo de desenvolvimento pessoal e profissional. Agradeço a todos os docentes que me acompanharam nessa jornada, que compartilharam de seus conhecimentos para fortalecer minha formação, especialmente ao meu orientador, prof. Dr. André Luis Olivete, por sua atenção, dedicação e disponibilidade para com o desenvolvimento deste trabalho.

#### **RESUMO**

Este documento apresenta um estudo e relatos de desenvolvimento de um sistema de controle de acesso e gerenciamento de ambientes baseado em Internet das Coisas (IoT). O sistema visa solucionar desafios de segurança e otimização de recursos no campus do Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP), campus de Presidente Epitácio, por meio da criação de uma fechadura eletrônica inteligente de baixo custo que utiliza ESP8266 como microcontrolador e opera de maneira multimodal, com a biometria ou RFID. 

Destarte, o trabalho busca a utilização dessa fechadura em conjunto a tecnologias *web* as quais servirão para a comunicação e troca de informações entre os dispositivos IoT e o utilizador que deseja verificar informações sobre o uso dessas fechaduras e, por conseguinte, das salas protegidas por elas. Neste cenário, foram pesquisadas técnicas de comunicação entre microcontroladores e maneiras de apresentação de dados em documentação de ferramentas ou artigos científicos de alguma forma parecidos com o projeto. 

Para o portal *web*, foi pensado de maneira que centralize o gerenciamento de fechaduras, permitindo o monitoramento do estado das portas (aberta ou fechada), bem como a gestão de utilizadores das fechaduras do campus, possibilitando um único cadastro de credenciais e informações pela aplicação *web*.

Quanto à arquitetura, foi projetada para ser modular e escalável, utilizando tecnologias como Node.js para o *backend*, React para o *frontend* e o protocolo MQTT via Node para a comunicação em tempo real entre o hardware e o servidor, demonstrando uma solução viável e de baixo custo para a moderniação da infraestrutura do campus.

**Palavras-chave:** Internet das Coisas; fechadura eletrônica; microcontrolador; biometria; gerenciamento de salas.

#### **ABSTRACT** 

This document presents a study and reports on the development of an access control and environment management system based on the Internet of Things (IoT). The system aims to solve security and resource optimization challenges on the campus of the Federal Institute of Education, Science, and Technology of São Paulo (IFSP), Presidente Epitácio campus, through the creation of a low-cost smart electronic lock that uses ESP8266 as a microcontroller and operates in a multimodal manner, with biometrics or RFID. 

Thus, the work seeks to use this lock in conjunction with web technologies that will serve for communication and information exchange between IoT devices and the user who wishes to verify information about the use of these locks and, consequently, the rooms protected by them. In this scenario, communication techniques between microcontrollers and ways of presenting data in documentation of tools or scientific articles somewhat similar to the project were researched. 

The web portal was designed to centralize lock management, allowing monitoring of door status (open or closed), as well as management of campus lock users, enabling a single registration of credentials and information through the web application.

In terms of architecture, it was designed to be modular and scalable, using technologies such as Node.js for the backend, React for the frontend, and the MQTT protocol via Node for real-time communication between the hardware and the server, demonstrating a viable and low-cost solution for modernizing the campus infrastructure.

**Keywords:** Internet of Things; electronic lock; microcontroller; room management.

#### **LISTA DE FIGURAS**

[Figura 1\. Diagrama de blocos da operação do projeto.	8](#figura-1.-diagrama-de-blocos-da-operação-do-projeto.)

[Figura 2\. Imagem do teste do sistema.	11](#figura-2.-imagem-do-teste-do-sistema.)

[Figura 3\. Fluxograma operacional do sistema.	12](#figura-3.-fluxograma-operacional-do-sistema.)

[Figura 4\. Diagrama completo do circuito do sistema de fechadura inteligente.	13](#figura-4.-diagrama-completo-do-circuito-do-sistema-de-fechadura-inteligente.)

[Figura 5\. Estrutura de API’s para acesso a dados.	16](#figura-5.-estrutura-de-api’s-para-acesso-a-dados.)

[Figura 6\. Componentes de hardware conectados.	17](#figura-6.-componentes-de-hardware-conectados.)

[Figura 7\. Tela do dispositivo cadastrando novo usuário.	18](#figura-7.-tela-do-dispositivo-cadastrando-novo-usuário.)

[Figura 8\. Fluxo dos processos de identificação e autenticação de usuários.	19](#figura-8.-fluxo-dos-processos-de-identificação-e-autenticação-de-usuários.)

[Figura 9\. Template de padrão de impressão digital.	24](#figura-9.-template-de-padrão-de-impressão-digital.)

[Figura 10\. Template de padrão de impressão digital.	25](#figura-10.-template-de-padrão-de-impressão-digital.)

[Figura 11\. Exemplos de sensores ópticos e capacitivos.	27](#figura-11.-exemplos-de-sensores-ópticos-e-capacitivos.)

[Figura 12\. Sistema interligado para controle de acesso.	32](#figura-12.-sistema-interligado-para-controle-de-acesso.)

[Figura 13\. Modelo lógico relacional do banco de dados.	37](#figura-13.-modelo-lógico-relacional-do-banco-de-dados.)

[Figura 14\. Listagem de salas e informações.	38](#figura-14.-listagem-de-salas-e-informações.)

[Figura 15\. Página React.	39](#figura-15.-página-react.)

[Figura 14\. Alguns endpoints documentados pelo Swagger.	39](#figura-14.-alguns-endpoints-documentados-pelo-swagger.)  
	

#### **LISTA DE SIGLAS**

*IoT		Internet of Things (Internet das Coisas)*  
*IFSP		Instituto Federal de Educação, Ciência e Tecnologia de São Paulo*  
*IFSP-PEP 	Instituto Federal de Educação, Ciência e Tecnologia de São Paulo \- Campus de Presidente Epitácio.*  
*MQTT	Message Queuing Telemetry Transport (Transporte de Telemetria para Enfileiramento de Mensagens)*  
*RFID	Radio-Frequency Identification (Identificação por Rádio-Frequência)*  
*NFC		Near Field Communication (Comunicação por Campo Próximo)*  
*TCC	Trabalho de Conclusão de Curso*  
*API	Application Programming Interface (Interface de Programação de Aplicações)*  
*GPIO	General-Purpose Input/Output*  
*GSM	 Global System for Mobile Communications*  
*SMS	Short Message Service*  
*UID	Unique Identifier*  
*DSP	Digital Signal Processor*  
*LCD	Liquid Crystal Display*  
*LED	Light Emitting Diode*  
*2FA	Two-Factor Authentication*  
*PIN	Personal Identification Number*  
*M2M	Machine-to-Machine*  
*MQTT	Message Queuing Telemetry Transport*  
*TCP/IP	Transmission Control Protocol/Internet Protocol*  
*SPA	Single Page Application*  
*ORM	Object Relational Mapping*  
*SQL	Structured Query Language*  
*SGBD	Sistema Gerenciador de Banco de Dados*  
*URL	Uniform Resource Locator*  
*CI/CD	Continuous Integration and Continuous Delivery/Deployment*  
*AWS    Amazon Web Services*  
*cURL   Client URL*

#### **SÚMARIO**

**[1\. INTRODUÇÃO	4](#introdução)**

[**2\. TRABALHOS RELACIONADOS	7**](#trabalhos-relacionados)

[2.1 Design and Construction of a Smart Lock System using Internet of Things (IoT)	7](#2.1-design-and-construction-of-a-smart-lock-system-using-internet-of-things-\(iot\))

[2.1.1 Metodologia e arquitetura de hardware	9](#2.1.1-metodologia-e-arquitetura-de-hardware)

[2.1.2 Arquitetura de software e funcionamento	11](#2.1.2-arquitetura-de-software-e-funcionamento)

[2.1.3 Resultados e testes apresentados	13](#2.1.3-resultados-e-testes-apresentados)

[2.1.4 Análise crítica e comparativa	14](#2.1.4-análise-crítica-e-comparativa)

[2.2 Sistema de Controle de Acesso Físico por Dispositivos com Identificação por RFID e Autenticação por Biometria de Impressão Digital	15](#2.2-sistema-de-controle-de-acesso-físico-por-dispositivos-com-identificação-por-rfid-e-autenticação-por-biometria-de-impressão-digital)

[2.2.1 Metodologia e arquitetura de hardware	16](#2.2.1-metodologia-e-arquitetura-de-hardware)

[2.2.2 Arquitetura de software e funcionamento	17](#2.2.2-arquitetura-de-software-e-funcionamento)

[2.2.3 Resultados e validação	19](#2.2.3-resultados-e-validação)

[**3\. FUNDAMENTAÇÃO TEÓRICA	21**](#fundamentação-teórica)

[3.1 Controle de acesso	21](#3.1-controle-de-acesso)

[3.1.1 Identificação	22](#3.1.1-identificação)

[3.1.2 Autenticação	22](#3.1.2-autenticação)

[3.1.3 Autorização	23](#3.1.3-autorização)

[3.2 Sistemas de autenticação	23](#3.2-sistemas-de-autenticação)

[3.2.1 Biometria por impressão digital	23](#3.2.1-biometria-por-impressão-digital)

[3.2.2 Sensores biométricos de impressão digital	25](#3.2.2-sensores-biométricos-de-impressão-digital)

[3.2.3 Identificação por rádio frequência	28](#3.2.3-identificação-por-rádio-frequência)

[3.3 Internet das Coisas	29](#3.3-internet-das-coisas)

[3.3.1 Hardware embarcado	30](#3.3.1-hardware-embarcado)

[3.3.2 Comunicação	30](#3.3.2-comunicação)

[**4\. DETALHES DE IMPLEMENTAÇÃO	32**](#detalhes-de-implementação)

[4.1 Bibliotecas	32](#4.1-bibliotecas)

[4.1.1 Front-end	33](#4.1.1-front-end)

[4.1.2 Back-end	34](#4.1.2-back-end)

[4.1.3 IoT	35](#4.1.3-iot)

[4.1.4 Documentação	35](#4.1.4-documentação)

[4.2 Desenvolvimento parcial	36](#4.2-desenvolvimento-parcial)

[4.2.1 Banco de dados	37](#4.2.1-banco-de-dados)

[4.2.2 Protótipo das telas do front-end	38](#4.2.2-protótipo-das-telas-do-front-end)

[4.2.3 Desenvolvimento do front-end	38](#4.2.3-desenvolvimento-do-front-end)

[4.2.4 Desenvolvimento do back-end	39](#4.2.4-desenvolvimento-do-back-end)

[4.2.5 Integração Contínua/Entrega Contínua	40](#4.2.5-integração-contínua/entrega-contínua)

[**6\. REFERÊNCIAS	42**](#6.-referências)

[**APÊNDICE A  – BANCO DE DADOS GERADO PELO ORM	46**](#apêndice-a-–-banco-de-dados-gerado-pelo-orm)

[**APÊNDICE B  – DOCKER-COMPOSE PARA PRODUÇÃO	50**](#apêndice-b-–-docker-compose-para-produção)

# 1. **INTRODUÇÃO**  {#introdução}

A gestão dos espaços físicos de uma instituição de ensino como o Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP), apresenta desafios relacionados à segurança e à otimização do uso de recursos. O controle de acesso a laboratórios, salas de aula e outros ambiente restritos é utilizado de maneira tradicional, como chaves físicas, que podem ser perdidas ou copiadas facilmente, ou com fechaduras eletrônicas caras e sem comunicação com um servidor. Neste cenário, pode ser gerado vulnerabilidades e perigos à segurança do patrimônio da instituição.

Dado isso, a Internet das Coisas (IoT) surge como uma solução à problemas enfrentados no IFSP \- Campus de Presidente Epitácio (IFSP-PEP), permitindo a conexão de objetos físicos à internet para a troca de dados e automação dos processos.  Neste caso, o gerenciamento eficiente do acesso às salas de aula e laboratórios é essencial para garantir o uso adequado dos espaços.

Segundo Pinheiro (2008), a biometria por impressão digital surge como uma alternativa mais segura, pois utiliza de características únicas e imutáveis do usuário, consideradas o tipo biométrico mais seguro para determinar a identidade depois do teste de DNA. Destarte, ao utilizar a biometria em conjunto com RFID, que possibilita uma identificação rápidarápida e sem contato, é instaurado um sistema híbrido que combina a facilidade de uso e segurança da informação e, por conseguinte, dos ambientes.

Este trabalho, por sua vez, propõe o desenvolvimento de uma solução de baixo custo para o controle de acesso a salas e laboratórios no IFSP-PEP. O sistema utiliza uma fechadura eletrônica inteligente baseada em um microcontrolador ESP8266, a qual integra um sensor biométrico para autenticação dos utilizadores ou RFID. A lógica de controle envolve um *broker* MQTT (Transporte de Telemetria para Enfileiramento de Mensagens) que liga o hardware (microcontrolador e sensores) com um servidor *backend*. Ademais, um portal *web* centraliza o gerenciamento, permitindo que os usuários monitorem o estado das portas e administradores mantenham as credenciais de utilizadores.

Este trabalho tem por objetivo desenvolver um sistema completo de controle de acesso e gerenciamento de salas no IFSP-PEP, baseado em tecnologias IoT e autenticação biométrica. São objetivos específicos deste trabalho:

* Integrar um microcontrolador com módulos de leitura biométrica e RFID.

* Implementar um *broker* MQTT via Node.js utilizando a biblioteca Aedes que permita a troca de mensagens entre o microcontrolador e o servidor.

* Criar um *backend* em Node.js com *framework* Fastify, incluindo um banco de dados PostgreSQL (via Drizzle ORM) para armazenar usuários, salas, portas e logs de acesso.

* Desenvolver uma API RESTful para a autenticação de usuários, gerenciamento de salas/portas, manutenção de credenciais e registro de eventos.

* Construir um portal *web* (*frontend*) em React que exiba o status em tempo real das portas, bem como consuma e disponibilize meios de integrar os *endpoints* da API () desenvolvida.

* Garantir a interoperabilidade e confiabilidade no monitoramento do estado das portas e na operação tolerante à falhas.

Diante disso, este trabalho justifica-se pela necessidade de desenvolver e implementar um sistema de controle de acesso que utilize biometria e RFID e tenha baixo custo para o campus. A proposta visa não apenas aumentar a segurança, mas também automatizar os processos de cadastramento de digitais vigentes no campus, fornecer uma maneira de visualização de dados em tempo real e garantir a flexibilidade de gerenciamento remoto e escalabilidade.

A metodologia deste trabalho inicia-se com uma revisão bibliográfica sobre conceitos de dispositivos de Internet das Coisas e protocolos de comunicação, visando identificar estudos relevantes no meio acadêmico, a fim de validar a integridade tecnológica do projeto. Serão analisadas e comparadas as técnicas na literatura e propostas de fechaduras eletrônicas inteligentes, estabelecendo assim uma base teórica robusta o qual o projeto deve fundamentar as soluções de seus problemas. Com base nessa revisão, serão selecionadas técnicas para experimentação inicial, desenvolvendo-se um protótipo preliminar para avaliar a comunicação entre os dispositivos. Após essa etapa, proceder-se-á com o refinamento do protótipo final. Por fim, serão realizados testes funcionais para validar o desempenho e a eficácia arquitetural do sistema.

A estrutura deste trabalho consiste em capítulos que abordam os principais conceitos, tecnologias e implementações necessárias para o desenvolvimento de um sistema de controle de acesso baseado em IoT com identificação por biometria de impressão digital ou RFID. A seguir, segue um resumo da estrutura do documento:

* Capítulo 1 \- Introdução: apresenta o contexto do trabalho, justificativa, relevância do tema, objetivos e metodologia utilizada.

* Capítulo 2 \- Trabalhos Relacionados: apresenta trabalhos relacionados os quais se assemelha integralmente ou parcialmente ao modelo proposto deste trabalho.

* Capítulo 3 \- Fundamentação Teórica: traz consigo os fundamentos teóricos necessários para a compreensão do projeto, incluindo conceitos de controle de acesso, indetificação, autenticação e autorização.

* Capítulo 4 \- Detalhes de Implementação: detalha a implementação do sistema (*software* e *hardware*) e descreve os requisitos do sistema IoT, os componentes utilizados e sua integração.

* Capítulo 5 \- Considerações Parciais: apresenta os resultados parciais obtidos a partir dos testes realizados.

* Capítulo 6 \- traz conclusões obtidas no desenvolvimento do projeto e sugestões para trabalhos futuros.

2. # **TRABALHOS RELACIONADOS** {#trabalhos-relacionados}

Este capítulo apresenta alguns trabalhos relacionados tanto ao controle de acesso por reconhecimento por biometria por digital/RFID, quanto à comunicação de dispositivos IoT com servidores para controle das informações. Ademais, também apresenta soluções disponíveis no mercado.

A seleção dos trabalhos foi realizada por meio de plataformas de busca acadêmica, a fim de garantir uma maior correlação com este projeto. Para os produtos disponíveis, foram utilizadas motores de busca na internet. Os itens selecionados apresentam diferentes implementações e utilizações, contribuindo para uma compreensão geral sobre o controle de acesso e comunicação IoT.

O trabalho de Aniru et al. (2024) propõe uma abordagem focada no controle de acesso via *software* embarcado o qual se comunica com um servidor baseado em Wi-Fi para o acionamento de abertura e trancamento automático de salas. Por conveniência acadêmica, o trabalho de Gonçalves (2025) utiliza o mesmo conceito físico (*hardware*), mas difere integrando autenticação biométrica e identificação por *RFID* combinadas a um servidor web para armazenamento local e validação autônoma. Nas subseções a seguir, cada pesquisa é analisada a fim de destacar componentes tecnológicos que justifiquem as escolhas metodológicas para este projeto. 

## **2.1 Design and Construction of a Smart Lock System using Internet of Things (IoT)** {#2.1-design-and-construction-of-a-smart-lock-system-using-internet-of-things-(iot)}

O objetivo do trabalho de Aniru et al. (2024) foi desenvolver uma fechadura eletrônica inteligente controlada por WiFi a fim de aumentar a segurança em casas. Utilizando ESP8266, fechadura solenoide, módulo de WiFi, bateria 12V, relés e outros periféricos, desenvolveu uma alternativa conveniente e adaptável de acesso residencial. Como objetivo secundário, este trabalho propôs realizar o acionamento remoto das fechaduras.

Os autorem dividem o processo de desenvolvimento desse sistema de acesso com fechadura eletrônica em três partes: a fonte de alimentação, a unidade de controle e a unidade de exibição. A Figura 1 representa o diagrama de blocos do sistema. O diagrama de blocos mostra o fluxo de energia e as interconexões entre os principais componentes do sistema. O microcontrolador NodeMCU atua como a unidade central de processamento. Os principais componentes representados incluem a trava solenoide para travamento/destravamento da porta, um regulador de tensão, um módulo de relé para controlar o solenoide, uma interface de usuário para interação com o sistema e um módulo Wi-Fi que permite conectividade sem fio e acesso remoto.

##### **Figura 1\. Diagrama de blocos da operação do projeto.** {#figura-1.-diagrama-de-blocos-da-operação-do-projeto.}

![][image1]

Fonte: Aniru et al., 2024

Este diagrama ilustra a integração e as relações funcionais entre esses elementos cruciais, fornecendo uma visão geral abrangente da arquitetura do sistema.

O trabalho de Aniru et al. (2024) é relevante por utilizar o mesmo microcontrolador (ESP8266) e a trava solenoide, validando a viabilidade desses componentes para o controle de acesso, também se justifica pela crítica aos sistemas tradicionais de fechaduras, classificados como “lentos, inseguros e com alta vulnerabilidade” segundo os autores, estes exigem intervenção humana direta para travar e destravar portas. A solução proposta visa oferecer aos usuários um nível de controle e acessibilidade sobre pontos de entrada de suas casas. Os objetivos específicos do estudo dos autores, conforme listados, eram:

* Projetar uma fechadura inteligente baseada em IoT que possa ser controlada remotamente;  
* Implementar uma interface de usuário amigável para a interação com o sistema;  
* Aprimorar a segurança de residências por meio de automação do processo de travamento;  
* Oferecer aos usuários uma maneira prática de acesso sem o uso de chaves físicas.

Como supracitado, seu foco é residencial, evidenciando um acionamento mais simples, não contemplando a autenticação multimodal por biometria e RFID e tampouco utiliza uma arquitetura de gerenciamento centralizado com portal web e *broker* MQTT proposta neste trabalho. Entretanto, alguns pontos do trabalho podem oferecer ajuda ao implementar a proposta deste trabalho, tais como a implementação da fechadura em si, disparo de comandos, ideias sobre a interação do usuário.

### **2.1.1 Metodologia e arquitetura de *hardware*** {#2.1.1-metodologia-e-arquitetura-de-hardware}

Como introduzido anteriormente, os autores se baseiam no projeto e construção de um protótipo físico, com o sistema dividido em tres unidades: alimentação, controle e exibição. A unidade de controle é a unidade central deste sistema, sendo análoga à camada de *hardware* deste trabalho de conclusão de curso (TCC).

O componente central da unidade de controle é o ESP8266, o mesmo utilizado como base neste presente trabalho. Os autores escolheram este por causa da capacidade de processamento e, principalmente, por seu módulo Wi-Fi integrado, permitindo a conexão direta com à Internet, sendo fundamental para qualquer dispositivo ou projeto IoT. Os componentes de *hardware* detalhados pelos autores e sua função no sistema são:

* **NodeMCU ESP8266**: Atua como a unidade central de processamento, sendo responsável pela conexão, autenticação e aguardo de comando remotos no servidor IoT utilizado, neste caso, o Blynk. Ao receber um comando, ele processa a lógica para acionar o atuador da fechadura.  
* **Fechadura Solenoide (12V)**: É o atuador do sistema, isto é, o componente que fará o papel de travamento e destavamento da porta de maneira eletromecânica. Os autores optaram por um um modelo “*fail-secure*”, ou seja, que permanece travado na ausência de energia, uma decisão de design voltada à segurança.  
* **Módulo de Relé (5V)**: Utilizado como interface entre o microcontrolador e o atuador. O relé atua como um interruptor (*switch*) controlado eletronicamente uma vez que o ESP8266 envia um sinal de baixa tensão (3.3V a 5V) para o relé, que então fecha um circuito separado, permitindo que a energia necessária de 12V flua para a trava solenoide.  
* **Unidade de Fonte de Alimentação**: O sistema é alimentado por uma bateria de 12V. Esta tensão alimenta diretamente a fechadura solenoide. Para o microcontrolador e o módulo do relé, utilizaram um conversor *buck* LM7805, que serve como um regulador de tensão que transforma os 12V da bateria para 5V estáveis necessários para estes componentes de controle, garantindo a estabilidade operacional do sistema.  
* **Outros itens descritos**: Os autores também descrevem o custo de itens não diretamente relacionados ao funcionamento da fechadura, tais como porcas, parafusos, placa de prototipagem, pinos de conexão, entre outros.

O diagrama de blocos apresentado na Figura 1 ilustra essa arquitetura, mostrando o fluxo de energia da bateria se dividindo: uma linha direta para o relé (que alimenta a solenoide) e outra passando pelo regulador de tensão para fornecer a energia necessária ao microcontrolador, que por sua vez controla o relé. A Figura 2 demonstra uma fotografia de teste do sistema na qual é possível visualizar esses componentes acoplados em prototipagem.

##### **Figura 2\. Imagem do teste do sistema.** {#figura-2.-imagem-do-teste-do-sistema.}

![][image2]

Fonte: Aniru et al., 2024

### **2.1.2 Arquitetura de *software* e funcionamento** {#2.1.2-arquitetura-de-software-e-funcionamento}

A arquitetura de *software* é um dos pontos de maior divergência em relação à este TCC. O sistema de Aniru et al. (2024) não utiliza um *backend*, uma interface de programação de aplicações (API) ou *broker* MQTT auto-hospedado. Em vez disso, ele depende inteiramente de uma plataforma de IoT como serviço, neste caso, a Blynk.

O *firmware* do dispositivo foi desenvolvido em C++ utilizando o Arduino IDE e contém a lógica para conectar o ESP8266 à rede Wi-Fi local e, subsequentemente, ao servidor em nuvem da plataforma da Blynk. A segurança da conexão entre o dispositivo e o servidor é garantida por um *token* de autenticação, que é um identificador único fornecido pela plataforma e inserido no código do ESP8266. Ou seja, o sistema não é, e nem pensa ser escalável em números de fechaduras eletrônicas.

Dado isso, o sistema propõe um fluxo operacional que inicializa e o ESP8266 conecta à rede de Internet sem fio por credenciais pré-programadas. Uma vez conectado à rede, o microcontrolador estabelece conexão com o servidor da Blynk, autenticando-se com o token único.

##### **Figura 3\. Fluxograma operacional do sistema.** {#figura-3.-fluxograma-operacional-do-sistema.}

![][image3]

Fonte: Aniru et al., 2024\. Traduzido e adaptado pelo autor.

O usuário, por sua vez, acessa a interface da plataforma em seu dispositivo, seja celular ou computador, e opera a fechadura por lá. Para isto, os autores configuraram uma interface de usuário simples a qual consiste em apenas um botão virtual, este que dispara a funcionalidade de abrir/fechar a fechadura eletrônica inteligente. Neste caso, o servidor da plataforma atua como um broker central que identifica o comando da interface (botão) e o retransmite para o microcontrolador, que está esperando os comandos do servidor.

O ESP8266 recebe o comando e seu firmware executa a lógica programada, que resume em alternar o estado de um pino GPIO (General-Purpose Input/Output) o qual, conectado ao relé, energiza o relé. Uma vez o relé energizado, fecha o circuito de 12V, permitindo que a corrente flua para a fechadura solenoide, que então é acionada e a fechadura alterna entre travada e destravada.

##### **Figura 4\. Diagrama completo do circuito do sistema de fechadura inteligente.** {#figura-4.-diagrama-completo-do-circuito-do-sistema-de-fechadura-inteligente.}

![][image4]

Fonte: Aniru et al., 2024

Este modelo é puramente reativo e exige uma intervenção do usuário em cada ação. Destarte, a unidade de exibição descrita pelos autores não é um portal *web*, mas sim a interface da plataforma utilizada.

### **2.1.3 Resultados e testes apresentados** {#2.1.3-resultados-e-testes-apresentados}

Os autores relatam que o sistema obteve sucesso em seu objetivo, uma vez que a metodologia de teste foi simples e direta: o sistema foi testado usando três dispositivos móveis independentes e, para cada dispositivo, foram realizadass dez tentativas de acionamento da fechadura.

Segundo Aniru et al. (2024), todas as tentativas interpretaram com precisão os comandos recebidos e transmitiram os sinais correspondentes para a interface, validando a funcionalidade do protótipo em um ambiente controlado.

Em sua conclusão, os autores afirmam que o sistema projetado é conveniente, seguro e de baixo custo, e que ele aprimora a segurança residencial ao fornecer uma alternativa moderna às chaves tradicionais. Sugerem como trabalho futuro, a adição de módulo GSM (Global System for Mobile Communications) para alertas via SMS (Short Message Service) em caso de falha do Wi-Fi, ou a integração de um teclado para entrada de senha como um método de autenticação alternativo.

### **2.1.4 Análise crítica e comparativa** {#2.1.4-análise-crítica-e-comparativa}

O trabalho de Aniru et al. (2024) é de notória relevância para este TCC, uma vez que fornece uma validação fundamental e independente para a escolha dos componentes de *hardware*. Ele confirma o microcontrolador ESP8266, em conjunto com um módulo de relé e uma fechadura solenoide 12V, como uma base viável, funcional e de baixo custo para um sistema de controle de acesso conectado.

Contudo, as semelhanças entre os projetos se resumem apenas à camada de *hardware* básica. A análise da arquitetura de Aniru et al. (2024) revela limitações significativas considerando o arcabouço institucional exigido. Tais limitações configuram os principais problemas funcionais que este trabalho se propõe a solucionar.

O sistema de Aniru et al. (2024) possui dependência completa a uma plataforma de terceiros (Blynk), ou seja, a gestão da *Internet of Things* não é auto-hospedada. Para implementações públicas de alta complexidade como as do IFSP, isso resulta num risco conceitual de privacidade e segurança de dados.
	Ademais, o sistema é inteiramente *online*, atrelado organicamente aos componentes e serviços prestados pela *startup* desenvolvedora. E, uma vez que o serviço da plataforma ou o plano gratuito que os autores utilizaram forem descontinuados, a solução proposta torna-se inoperável.

Nesse cenário, essa modelagem corrobora e valoriza a proposição deste projeto por um servidor de mensagens *MQTT* auto-hospedado configurado via Aedes e a separação operacional pelo *backend* autoral. Isso confere independência dos fluxos de autorização para o IFSP e permite comunicação *offline* intrarede, isolando instabilidades sistêmicas ou dependência corporativa da *internet* banda larga das operadoras.

## **2.2 Sistema de Controle de Acesso Físico por Dispositivos com Identificação por RFID e Autenticação por Biometria de Impressão Digital** {#2.2-sistema-de-controle-de-acesso-físico-por-dispositivos-com-identificação-por-rfid-e-autenticação-por-biometria-de-impressão-digital}

O trabalho de Gonçalves (2025) teve como objetivo propor uma solução para um problema semelhante ao deste TCC. O autor também visa a segurança de aceso em um ambiente acadêmico e utiliza uma combinação de tecnologias de autenticação (RFID e biometria) o qual espelha a proposta central deste trabalho de conclusão de curso.

Segundo Gonçalves (2025) o sistema de chaves mecânicas tradicional como um método inseguro e de difícil gerenciamento, uma vez que existe uma facilidade notável para cópia das chaves, perda e a falta de qualquer registro ou auditoria de acesso. Isso é apontado no estudo do autor como vulnerabilidades críticas para a segurança patrimonial.

O objetivo geral deste trabalho foi desenvolver um sistema de controle de acesso físico de baixo custo e seguro, utilizando autenticação por impressão digital e identificação por RFID por meio de um microcontrolador ESP32.

Ademais, o autor têm como objetivos a especificação dos componentes de *hardware* e *software* necessários para a construção de um protótipo funcional, a implementação destes componentes afim de que integre, no microcontrolador, o leitor RFID e o sensor biométrico. Dito isso, o autor buscou desenvolver a lógica de *software* embarcada (escrita em C/C++) e realizar testes funcionais para validar o protótipo em cenários de cadastro, autenticação e remoção de usuários.

Neste cenário, o escopo do trabalho de Gonçalves (2025) é, portanto, a criação de um dispositivo de *hardware* autônomo, com o foco de provar que a combinação de dois métodos (biometria por digital e RFID) para a autenticação é funcional, segura e pode ser implementada em um dispositivo de baixo custo.

##### **Figura 5\. Estrutura de API’s para acesso a dados.** {#figura-5.-estrutura-de-api’s-para-acesso-a-dados.}

![][image5]

Fonte: Gonçalves, 2025

Por outro lado, como visto na Figura 5, o escopo não abrange a comunicação em rede, o gerenciamento centralizado ou a integração com um sistema de *software* externo, que são diferenciais e pontos centrais deste TCC.

### **2.2.1 Metodologia e arquitetura de hardware** {#2.2.1-metodologia-e-arquitetura-de-hardware}

A solução de hardware proposta por Gonçalves (2025) serve como material de estudo para a validação dos componentes de *hardware*, uma vez que busca sanar a mesma dor com recursos e limitações parecidas.

O componente central da unidade de controle é o ESP32, especificamente o *kit* de desenvolvimento ESP32-WROOM-32. Os autores escolheram este por causa da capacidade de processamento, baixo custo, baixo consumo de energia e, crucialmente, por sua conectividade Wi-Fi e Bluetooth integrada. Assim, os componentes de *hardware* detalhados pelos autores e sua função no sistema são:

* **NodeMCU-ESP32**: Similar ao ESP8266 utilizado neste TCC, atua como a unidade central de processamento. Este é responsavel por receber e interpretar os comandos a serem repassados aos atuadores do sistema.  
* **Sensor RFID RC522**: Um leitor/gravador RFID passivo que opera na frequência de 13,56 Mhz. O autor o utiliza para leitura de identificador único (UID) de *tags* Mifare, que servem como primeiro fator de identificação do usuário.  
* **Sensor biométrico DY50**: Um módulo óptico que possui processador DSP (Processador de Sinal Digital) interno próprio, capaz de capturar a imagem da digital, processá-la e armazenar via *template* (um modelo matemático da digital) em sua própria memória *flash* interna. Esta capacidade de armazenamento local do sensor é um ponto-chave da arquitetura do autor e um ponto a se estudar para este TCC.  
* **Interface e atuadores**: Gonçalves (2025), em seu sistema, inclui componentes de feedback local, como um display LCD (Display de Cristal Líquido) 120x4 para exibir instruções ao usuário, LEDs (Diodos Emissores de Luz) de status, um *buzzer* para feedback sonoro e, para o acionamento, uma trava solenoide de 12V, tal como no trabalho citado anteriormente, controlada por um módulo relé.

	##### **Figura 6\. Componentes de *hardware* conectados.** {#figura-6.-componentes-de-hardware-conectados.}

![][image6]

Fonte: Gonçalves, 2025

### **2.2.2 Arquitetura de *software* e funcionamento** {#2.2.2-arquitetura-de-software-e-funcionamento}

A arquitetura de *software* do trabalho de Gonçalves (2025) é inteiramente monolítica e embarcada, isto é, toda a lógica do sistema, desde o cadastro de usuários até a verificação de autenticação, reside e é executada dentro do firmware do ESP32. O *software* foi desenvolvido em C/C++ utilizando a Arduino IDE como ambiente de desenvolvimento.

A arquitetura de operação de Gonçalves (2025) assemelha-se com as fechaduras vigentes no IFSP-PEP, uma vez que toda a autenticação e seus cadastros são realizados no próprio *hardware*, com a estrutura monolítica controlando os modos do modelo, utilizando para isso um cartão mestre.

No cadastro, o administrador porta este cartão para ativar o modo de controle, e então aproxima a *tag* RFID do usuário. O microcontrolador armazena esse código de série (UID) da *tag*. Em seguida, o processo emite alertas para leitura sequencial da biometria pela leitora. A Figura 7 apresenta a tela do dispositivo cadastrando um novo usuário neste processo iterativo.

##### **Figura 7\. Tela do dispositivo cadastrando novo usuário.** {#figura-7.-tela-do-dispositivo-cadastrando-novo-usuário.}

![][image7]

Fonte: Gonçalves, 2025

O sistema, para a autenticação, foi projetado como um fator de identificação por dois fatores (2FA), uma vez que o autor identificou problemas na leitura biométrica por digital com sensores ópticos de falsos positivos. Uma vez que ao ler a digital de algum não usuário e compará-la com a impressão digital de outros usuários, poderia acontecer desta pessoa não cadastrada ser autenticada como outro usuário, gerando um risco de segurança e inconsistência dos registros.

##### **Figura 8\. Fluxo dos processos de identificação e autenticação de usuários.** {#figura-8.-fluxo-dos-processos-de-identificação-e-autenticação-de-usuários.}

![][image8]

Fonte: Gonçalves, 2025

Foi pensando nisso que o autor propôs a identificação por RFID para isolar o usuário e comparar à biometria apenas do usuário o qual possui a *tag* cadastrada em seu nome, assim como sugere a Figura 7\. 

### **2.2.3 Resultados e validação** {#2.2.3-resultados-e-validação}

Gonçalves (2025) executou uma seŕie de testes funcionais para validar cada fluxo lógico do sistema em diferentes cenários operacionais, tal como teste de identificação por RFID, que teve como objetivo verificar o reconhecimento dos cartões Mifare cadastrados no banco de dados.

Neste primeiro teste foram avaliados tempo de resposta entre a aproximação do cartão e o reconhecimento, a rejeição de cartões não cadastrados e obteve sucesso nessa operação, uma vez que os cartões cadastrados foram devidamente identificados e os não cadastrados foram rejeitados. Além disso, o autor diz que tempo médio de resposta foi inferior a 500ms, garantindo uma identificação rápida e eficiente.

Também foram executados testes de modos de operação, para validar a autenticação por impressão digital, que atingiu resultados esperados, rejeitando impressões não cadastradas ou associadas a registros diferentes dos quais se buscava autenticação.

Ademais, a comunicação via *Wi-Fi* foi testada para verificar a conectividade e a atualização dos dados no banco de dados MySQL utilizado. Foram analisados cenários onde forçava-se indisponibilidade no servidor, verificando se o sistema ainda funcionaria tanto em autenticação, quanto em enfileiramento dos *logs* de acesso.

### **2.3 Tabela Comparativa de Trabalhos Relacionados**

A partir das análises conduzidas, é possível comparar os pontos cruciais metodológicos e recursos estruturantes integrados no modelo de Aniru et al. (2024) e Gonçalves (2025), destacando assim os eixos de inovação aos quais este trabalho (2024) pretende se diferenciar, sobretudo pelo aspecto de monitoramento institucional em tempo real, armazenamento autoral e protocolo *MQTT*.

A Tabela 1 esquematiza essa comparação:

**Tabela 1. Comparativo entre abordagens de IoT para controle de acesso físico**
| Característica | Aniru et al. (2024) | Gonçalves (2025) | Presente Trabalho |
| :--- | :--- | :--- | :--- |
| **Microcontrolador** | ESP8266 | ESP32 | ESP8266 |
| **Métodos de Autenticação** | App Web Remoto | Biometria e *RFID* (2FA) | Biometria e *RFID* (Multimodal) |
| **Arquitetura de Software** | Nuvem externa (Blynk) | *Software* Embarcado (Monolito) | Nuvem híbrida (Auto-hospedada) |
| **Comunicação de Dados** | Plataforma fechada | HTTP / MySQL  | *MQTT* (Pub/Sub) |
| **Gerenciamento Centralizado** | Não suportado | Não | Sim (*Frontend* React) |
| **Independência da Internet** | Nenhuma (*Online* obrigatório)| Parcial | Total (*Offline* interativo) |

*Fonte: elaborado pelo autor (2024).*

Conclui-se que o presente trabalho expande as arquiteturas estudadas ao assegurar tanto a robustez do sensoriamento duplo (Gonçalves, 2025) quanto o controle automatizado e escalável de informações assíncronas do estado de servidores (Aniru et al., 2024), mantendo ao mesmo tempo um ecossistema inteiramente sob controle do instituto tecnológico.

3. # **FUNDAMENTAÇÃO TEÓRICA** {#fundamentação-teórica}

A fim de fundamentar tecnicamente este trabalho, esta seção aborda conceitos essenciais de controle de acesso e biometria, destacando conceitos de identificação, autenticação e autorização, computação oblíqua, comunicabilidade entre aplicações e visualização de dados em tempo real. Nesse contexto, explora tecnologias biométricas com foco na impressão digital e tecnologias de comunicação entre dispositivos e servidores a fim de o resultado do trabalho passe uma melhor experiência de usuário.

## **3.1 Controle de acesso** {#3.1-controle-de-acesso}

O controle de acesso é um serviço de segurança fundamental, responsável por mediar o acesso à recursos específicos. Segundo Stallings (2015), o controle de acesso é definido como a função que limita e domina o acesso a sistemas e aplicações. Embora frequentemente aplicado a sistemas lógicos, seus princípios podem ser utilizados para a segurança física de ambiente.

Um modelo de controle de acesso robusto é comummente decomposto em três fases sequenciais:

1. **Identificação**: Ato de um usuário alegar uma identidade. No cenário deste trabalho, esta etapa é realizada por meio de um identificador único inserido no cartão RFID ou pela biometria por digital do usuário.  
2. **Autenticação**: Esta fase refere-se à garantia de que uma comunicação é autêntica (STALLINGS, 2015). Esta é a etapa de verificação, que comprova que o identificador único ou a biometria fornecido corresponde à um usuário legítimo do sistema.  
3. **Autorização**: Depois de uma autenticação bem-sucedida, o sistema deve determinar quais ações o usuário autenticado tem permissão para executar. Neste caso, se houver o identificador do usuário como permitido para uso de uma determinada porta, ele poderá adentrar.

	 ### **3.1.1 Identificação** {#3.1.1-identificação}

A identificação, como supracitado, é o processo pelo qual se determina a identidade de um indivíduo. Para Pinheiro (2008), a identificação é a função em que o usuário declara sua identidade para o sistema. Deste modo, o processo se torna em identificar um usuário dentre um todo, uma análise do tipo um para muitos (*one-to-many*), que pode trazer inconsistências e falsos positivos.

Não obstante, inconsistências são mais identificadas em leitores ópticos de biometria, o qual será testada se há a viabilidade e necessidade de uma implementação de 2FA para este trabalho, em que o usuário fornecerá o identificador RFID e a biometria em conjunto, o primeiro para filtrar o usuário e o segundo para assegurar que é ele mesmo, fazendo assim uma análise do tipo um para um (*one-to-one*).

Segundo Maltoni et al. (2022), a identificação é considerada um problema mais complexo que a verificação, em especial casos onde possui uma grande base de dados, devido a necessidade de distinguir entre muitos indivíduos cadastrados, tal como os servidores do IFSP-PEP.

### **3.1.2 Autenticação** {#3.1.2-autenticação}

A autenticação é o processo de validação do qual verifica se o indivíduo que tenta o acesso é quem diz ser. De acordo com Pinheiro (2008), os métodos de autenticação podem ser classificados em três categorias principais:

1. **Algo que o usuário sabe**: podendo o conhecimento de uma informação secreta, como senha, PIN (número de identificação) ou respostas à perguntas de segurança.  
2. **Algo que o usuário possui**:  consiste em objetos físicos que um indivíduo pode levar consigo, como *tags* para o acesso, as próprias chaves físicas de uma fechadura, um dispositivo gerador de códigos (*tokens*).  
3. **Algo que o usuário é**: este diz sobre as características intransferíveis identificadoras de um usuário, tais como impressões digitais, a face para reconhecimento facial, íris ou padrões de voz.

	No caso deste trabalho, a ideia é que o usuário se identifique à fechadura por meio de uma *tag* RFID ou da sua biometria por digital e ao portal *web* com sua senha pessoal de acesso.

### **3.1.3 Autorização** {#3.1.3-autorização}

Com o sucesso das duas fases anteriores, a autorização é o processo que determina quais permissões serão dadas àquele usuário. Esta fase assegura que nenhum acesso restrito será concebido erradamente. De acordo com Pinheiro (2008), a autorização lida sobre os aspectos de segurança os quais o usuário poderá realizar.

Por exemplo, num sistema de controle de acesso, um certo tipo de usuário pode acessar determinadas salas, mas outras salas ele não terá acesso, pois não faz parte de sua permissão concedida. O mesmo se aplica para a plataforma *web*. Apenas um tipo determinado de usuário será capaz de gerir os dados e informações sobre outros usuários e salas. 

## **3.2 Sistemas de autenticação** {#3.2-sistemas-de-autenticação}

A segurança de um sistema de autenticação é frequentemente medida pela força e pela quantidade de fatores que utiliza. A abordagem deste TCC visa utilizar uma credencial RFID e/ou a impressão digital de seus usuários, visando um sistema flexível e de alta segurança.

### **3.2.1 Biometria por impressão digital** {#3.2.1-biometria-por-impressão-digital}

A biometria, por definição, refere-se a uma medida biológica ou característica física que pode ser usada para identificar indivíduos, como são os casos das impressões digitais, reconhecimento facial e varificação da retina. (KASPERSKY, s.d.)

Segundo a Kaspersky (s.d.), a biometria está se tornando uma camada avançada em muitos sistema de segurança pessoal e empresarial. Neste caso, o autor aplica esta camada no setor institucional do campus do IFSP-PEP. A biometria tem como objetivo resolver problemas com o acesso tradicional, vinculando a comprovação de identidade aos corpos dos usuários e padrões de comportamento.

A adoção de acesso por biometria se torna conveniente pela conveniência, uma vez que a biometria está sempre com o usuário e não pode ser perdida ou esquecida e também por ser intransferível, uma vez que não pode ser roubada, diferente de uma chave tradicional ou uma senha.

De acordo com Yahya et al. (2016), existem processos estruturados que garantem a identificação e autenticação de indivíduos e podem ser divididos em quatro etapas principais: captura, extração de características, comparação de padrões e armazenamento de dados.

A segurança biométrica inicia pela coleta dos dados biométricos da pessoa. São coletados por meio de sensores, como *scanners*, de impressões digitais, câmeras ou microfones. A qualidade da captura é ponto essencial para o desempenho do sistema, uma vez que dados melhor coletados são mais fáceis de serem identificados. 

Os dados, por sua vez são descritos pelas minúcias de cada impressão digital, onde cada indivíduo possui padrões exclusivos de cristas e vales. São padrões fundamentais para identificação e autenticação. Segundo Natosafe (2022), existem vários tipos de minúcias e é possivel encontrar em uma imagem de boa qualidade de 40 a 100 minúcias. Veja exemplos na Figura 9:

##### **Figura 9\. Template de padrão de impressão digital.** {#figura-9.-template-de-padrão-de-impressão-digital.}

![][image9]

Fonte: Rahman, 2025

Uma vez obtidos e mapeados, são salvos para resem comparados com tentativas futuras de acesso. Na maioria das vezes, estes dados são criptografados e armazenados em um dispositivo ou servidor remoto. (KASPERSKY, s.d.)

##### **Figura 10\. Template de padrão de impressão digital.** {#figura-10.-template-de-padrão-de-impressão-digital.}

![Template de padrão de impressão digital][image10]

Fonte: Rahman, 2025

Após a captura, os dados brutos coletados são processados para identificar características relevantes que os fazem ser únicos, como por exemplo os padrões únicos da impressão digital, que são convertidos em um formato matemático conhecido como *template*. Esses templates dizem, numericamente, sobre as minúcias reconhecidas da impressão digital coletada.

	Como citado anteriormente, os modelos biométricos são armazenados em bancos de dados locais ou remotos. A segurança desse armazenamento é essencial a fim de garantir que estes dados estejam protegidos contra acessos indevidos ou usos não autorizados.

	Neste âmbito, os sensores biométricos desempenham o papel principal de todo o controle de acesso para o trabalho na captura e digitalização das minúcias das impressões digitais de um indivíduo seja na captura para cadastro ou para comparação.

### **3.2.2 Sensores biométricos de impressão digital** {#3.2.2-sensores-biométricos-de-impressão-digital}

De acordo com Aratek (2023), os sensores biométricos podem ser classificados pelo modo de operação e de acordo com as tecnologias utilizadas na captura das impressões digitais. Podemos clasificar, pelo modo de operação, em sensores de deslizamento e sensores de toque e também podemos classificar, pelas tecnologias utilizadas, em sensores ópticos, sensores capacitivos, sensores ultrassônicos e sensores térmicos.

Sensores de deslizamento requerem que o usuário deslize a superfície do dedo sobre ele e assim ele faz a construção da imagem da impressão digital no escaneamento. Estes são mais compactos e têm menor custo, porém apresentam uma taxa maior de ocorrências de erro em leitura. Já os sensores de toque são mais rápidos e, portanto, mais convenientes em diversas situações.

Sensores ópticos capturam a imagem da impressão digital utilizando a luz, estes são mais comumente vistos sendo utilizados, porém têm menor precisão e são mais suscetíveis a fraudes.

Sensores capacitivos detectam as impressões digitais utilizando o princípio da capacitância para criar uma imagem detalhada. Estes medem as pequenas variações de capacitância entre as cristas e os vales de uma impressão digital, sendo reconhecidos por sua segurança, precisão e resistência a ruídos.

Os sensores ultrassônicos, como o nome sugere, utilizam ondas ultrassônicas para capturar imagens de três dimensões das impressões digitais, garantindo maior segurança em comparação às tecnologias anteriores. São amplamente utilizadas em dispositivos celulares e são conhecidos por sua eficiência no reconhecimento de impressão digital.

Por fim, temos os sensores térmicos, que se baseia entre as diferenças entre o ar e a pele para determinar a identificação do usuário. Estes detectam discrepâncias de temperatura entre as cristas e vales da impressão digital para detalhar a biometria.

##### **Figura 11\. Exemplos de sensores ópticos e capacitivos.** {#figura-11.-exemplos-de-sensores-ópticos-e-capacitivos.}

![][image11]![][image12]

Fonte: Aratek, 2023

Essas tecnologias de sensores biométricos podem ser comparadas avaliando com base nos seguintes critérios: 

* **Qualidade da imagem**: onde é melhor aquele que é capaz de capturar dados mais precisos e detalhados da digital;  
* **Velocidade de captura**: no qual é medido o tempo necessário desde a captura até a autenticação da impressão digital;  
* **Eficiência energética**: se tratando de IoT, os dispositivos devem se preocupar em consumir o mínimo de energia possível, para agregar valor com o mínimo de bateria ou consumo de energia;  
* **Tamanho**: a ideia da computação oblíqua, em sua maioria, é a necessidade de computação em sistemas leves e compactos;  
* **Custo**: tal como a proposta desse trabalho, a viabilidade de um projeto pode ter relação direta com o impacto financeiro que ela causa, ainda mais quando a ideia é ter diversos dispositivos;  
* **Robustez**: a capacidade de operar em condições adversas, tal como umidade, sujeira, desgaste físico e ação do tempo;  
* **Segurança**: os dispositivos devem ser seguros no sentido que as informações não devem ser possíveis de manipulação e devem resistir à tentativas de falsificação de credenciais.

	A escolha de um sensor de impressão digital é primordial, uma vez que existe um problema na interoperabilidade entre diferentes sensores de biometria por impressão digital, uma vez que não existe padrão nos *templates* utilizados pelos fabricantes, logo um valor de leitura num sensor X não será o mesmo num sensor Y, mesmo aplicando a mesma impressão digital. Neste caso, a falta de um formato comum de modelo torna incompatível a comparação entre dados coletados em sensores diferentes.

	Existem iniciativas como a ANSI/INCITS 378 ou a ISO/IEC 19794-2 que surgem para mitigar a falta de padronização dos *templates* dos sensores, mas ainda não é um padrão utilizado pela indústria.

### **3.2.3 Identificação por rádio frequência** {#3.2.3-identificação-por-rádio-frequência}

Paralelamente à biometria, o sistema utiliza a identificação por rádio frequência (RFID) como método de identificação e, em casos de menor rigor à segurança, como método de autenticação.

O RFID permite a transferência de dados sem fio por meio de campos eletromagnéticos, desse modo, um sinal de rádio de baixa potência é emitido e lido por seus componentes, que consiste em um leitor e uma *tag*. 

Segundo Finkenzeller (2010), o leitor fica emitindo seu sinal e quando uma *tag* entra no alcance desse sinal, é energizada e então transmite seu identificador único ao leitor.

Embora seja altamente conveniente por sua leveza e dimensão mínima, Puhlmann (2015) adverte que este método é vulnerável, pois pode facilmente ser lidos e clonados. No entanto, é um ponto a ser estudado para a possível aplicação de primeiro fator de identificação numa autenticação em dois fatores, conforme validado por Gonçalves (2025).

Os sistemas RFID, segundo Gonçalves (2025), têm uma ampla gama de aplicações, incluindo logística e rastramento, que lidam por exemplo com identificação de contêineres, vagões, caminhões e controle de estoque; identificação de pessoas e animais por meio de crachás eletrônicos, *tags* de identificação ou implantes subcutâneos; pagamentos eletrônicos, como bilhetes para transporte público, cartões virtuais em *e-wallets*, pedágios eletrônicos; e controle de acesso e antifurto em sistemas de lojas de departamentos, inventários ou segurança patrimonial.

A tecnologia RFID oferece benefícios como maior segurança, automação de processos ou aumento da eficiência no rastreamento de bens e pessoas. Contudo, deve se atentar na escolha dos componentes adequados à aplicação desejada, preocupando-se com segurança e agilidade da informação e comunicação.

## **3.3 Internet das Coisas** {#3.3-internet-das-coisas}

A Internet das Coisas ou IoT é uma tecnologia que permite conectar dispositivos do cotidiano à internet e computadores. Isso possibilita o controle, a comunicação e a interação entre eles. (CNN Brasil, 2023\)

Segundo Kevin Ashton (2009), criador do termo IoT, se o mundo tivesse computadores que soubessem de tudo o que há para saber sobre coisas, usando dados advindos de coletas, sem qualquer interação humana, seria capaz de monitorar e mensurar tudo, reduzindo o desperdício, as perdas e o custo.

Gubbi et al. (2013) definem a IoT como um paradigma que possibilita a onipresença de uma variedade de coisas ou objetos, isto é, que são capazes de interagir entre si e cooperar com seus vizinhos almejando objetivos comuns. No cenário deste TCC, são as fechaduras eletrônicas que irão interagir com um servidor central a fim de garantir a segurança do controle de acesso e reportar seu estado.

Esta interação configura uma comunicação máquina para máquina (M2M), que é a base da IoT. O microcontrolador da fechadura e o servidor trocam informações sem a necessidade de uma intervenção humana direta.

Segundo a CNN Brasil (2023), a IoT tem mudado como as pessoas lidam com dados e interagem com dispositivos, de forma que ela facilita que as empresas e pessoas possam ter mais informações e agilidade para acessá-las.

Destarte, o intuito desse trabalho é exatamente este: agilizar e facilitar o acesso às salas mediante credenciais pré-cadastradas, gerenciar a localização de salas livres e otimizar as dinâmicas de uso do espaço físico do campus. Além disso, por meio do registro contínuo dos metadados de acesso (como identificador do usuário e porta designada), a plataforma permite, inferencialmente, que o sistema rastreie a última movimentação dos servidores (técnicos e docentes) do IFSP-PEP no *campus*, contanto que estejam autenticados em uma sala monitorada, o que expande o controle de gestão patrimonial e a segurança coletiva. O sistema web processa de modo centralizado esses registros, exibindo o status atual das fechaduras e os eventuais identificadores vinculados, propiciando um arcabouço para monitoramento interno.

### **3.3.1 *Hardware* embarcado** {#3.3.1-hardware-embarcado}

O *hardware* utilizado no projeto é o NodeMCU v3 ESP8266MOD, que utiliza o *chipset* ESP8266 fabricado pela Espressif Systems, conhecido por sua versatilidade, performance e custo-benefício e amplamente utilizado em projetos de IoT em automação, controle industrial e outras aplicações embarcadas.

Este microcontrolador conta com Wi-Fi integrado, essencial para a aplicação que exige comunicação sem fio. Adjunto com seu módulo GPIO, isso faz com que o dispositivo possa enviar e receber informações pela rede de maneira que as informações entre ele e o servidor central.

A popularidade do ESP8266 se dá, em sua maioria, pela disponibilidade de placas de desenvolvimento ou *protoboards*, os quais facilitam a implementação e criação de protótipos. Além disso, possui baixo custo e uma comunidade numerosa, que tornam uma ótima escolha para um projeto.

### **3.3.2 Comunicação** {#3.3.2-comunicação}

Em um ecossistema IoT, onde múltiplos dispositivos necessitam de uma comunicação eficiente e confiável. Neste caso, a escolha do protocolo de comunicação é crítica, neste trabalho, adota-se o Message Queuing Telemetry Transport (MQTT).

O MQTT é um protocolo leve, que opera sobre o TCP/IP e utiliza um padrão de publicador e assinante (*pub/sub*). Projetado por Andy Stanford-Clark e Arlen Nipper para funcionar em locais remotos onde a largura de banda era limitada ou instável. (BANKS et al., 2019\)

Segundo Banks et al. (2019), a MQTT é definida por ser ideal para telemetria e comunicação M2M. Sua arquitetura é definida em três elementos:

* **Publisher (publicador)**: O cliente que envia a mensagem, onde neste trabalho seria um microcontrolador ESP8266 publicando uma tentativa de acesso ou um servidor central publicando um comando para as fechaduras.  
* **Subscriber (assinante)**: O cliente que recebe a mensagem, onde o servidor assina os tópicos de estados das fechaduras e os microcontroladores assinam os tópicos de comandos.  
* **Broker (corretor)**: O servidor central que recebe todas as mensagens dos *publishers* as filtram e encaminham apenas para os assinantes pertinentes.

Portanto, o *MQTT* oferece a estabilidade que ambientes de controle de acesso necessitam para coordenar *hardware* e validações rápidas.

4. # **DETALHES DE IMPLEMENTAÇÃO** {#detalhes-de-implementação}

Neste capítulo são apresentados os detalhes de implementação desenvolvidos no trabalho. Até o momento, foram desenvolvidos o módulo para a comunicação IoT, o início da plataforma *web*, a API a qual a plataforma *web* consumirá e também foi iniciado o desenvolvimento, a fim de estudo, da utilização dos microcontroladores se comunicando com o servidor.

Estes estão conectados entre si, para que todos os módulos possam se comunicar, diretamente ou por meio de intermediadores, assim como é mostrado na Figura 12.

##### **Figura 12\. Sistema interligado para controle de acesso.** {#figura-12.-sistema-interligado-para-controle-de-acesso.}

![][image13]

Fonte: Autor

## **4.1 Bibliotecas** {#4.1-bibliotecas}

Para o desenvolvimento dos módulos, foram utilizadas tecnologias e bibliotecas as quais o autor achou necessário para a implementação da aplicação como um todo. Tais como Node.js com o *framework* Fastify para as funções de *back-end*, que se comunicam com um banco de dados PostgreSQL via Drizzle ORM.

O *back-end* será responsável para a criação de *endpoints* que o *front-end* consumirá, nele, toda a lógica operacional do portal *web* será feita, ou seja, o processamento dos dados fornecidos pelos usuários ou pelo banco de dados do portal para que sejam exibidos e armazenados apropriadamente.

Já para o *front-end*, foi utilizado React, uma biblioteca moderna de desenvolvimento *web* baseada em JavaScript. Nesta aplicação, a arquitetura adotada evoluiu para a Renderização do Lado do Servidor (SSR - *Server-Side Rendering*) por meio do *framework* TanStack Start, permitindo alta performance e compatibilidade de rotas. O desenvolvimento é feito utilizando TypeScript, um *superset* de JavaScript que permite a tipagem, visando escalabilidade e manutenibilidade estrutural.

Para a prototipação das interfaces de usuário (UI) e usabilidade de usuário (UX) no portal, foi utilizado o Figma, *software* utilizado para a criação de protótipos de alta fidelidade, priorizando a criação de telas e interação.

Para o desenvolvimento da comunicação entre os microcontroladores com o servidor central, como adiantado, é o MQTT. Este foi também desenvolvido sobre o Node.js, mas desta vez com a biblioteca Aedes.

Para os microcontroladores, foram implementados sua lógica inicial pelo Arduino IDE com C/C++, desta forma podendo se conectar ao *hardware* e inserir o *firmware* necessário.

### **4.1.1 Front-end** {#4.1.1-front-end}

React é uma biblioteca JavaScript criado pelo Facebook (atual Meta) que é usado para criar interfaces de usuário (UI) em aplicativos web. Possui uma baixa curva de aprendizado e é altamente flexível e escalável. Podemos encontrar sua utilização por empresas de tecnologia, incluindo o Facebook, Instagram e Airbnb.

No React, uma aplicação *web* é enxergada como um conjunto de componentes reutilizáveis, onde cada porção de página pode ser componentizada. Essas porções, por sua vez, podem atualizar de estado independente de um recarregamento completo da página.

O React pode mudar a forma como é pensado os designs observados e as aplicações construídas. Quando a primeira UI com React é construída, primeiro é necessário que o desenvolvedor o divida nestes componentes supracitados. Em seguida, é necessário descrever os diferentes estados visuais para cada um destes componentes. Finalmente, os componentes são conectados para que os dados fluam através deles.

Nesta plataforma, adjunto ao React, será utilizado outras bibliotecas também para o *front-end*, tais como o Tailwind CSS, que é um *framework* CSS utilitário no qual possui diversas classes pré definidas para agilizar a estilização e o uso de componentes customizáveis pré prontos como em bibliotecas como o ShadCN.

Por fim, para se conectar ao *back-end*, foi utilizado Tanstack Query para fazer as chamadas aos *endpoints* disponíveis. Além do TanStack Query, a estruturação de rotas de página e a renderização do lado do servidor são gerenciadas inteiramente pelo TanStack Start, um *framework* moderno construído sobre o ecossistema Vite, garantindo que o portal e a documentação associada possuam alta performance de indexação adequada monitorando e sincronizando dados com a API.

### **4.1.2 Back-end** {#4.1.2-back-end}

O *back-end*, serve como um maestro para os dados, isto é, ele quem fará todo o processamento das requisições e dados brutos para serem salvos e/ou emitidos.

Para este trabalho utilizamos Node.js, que é um ambiente de execução JavaScript gratuito, de código aberto e multiplataforma que permite aos desenvolvedores criar servidores, aplicativos da *web*, ferramentas de linha de comando e scripts.

Neste caso, é utilizado para a construção de um servidor de API RESTful que cria os *endpoints* a serem utilizados, ou seja, cria rotas que as aplicações podem visitar e trocar informações.

Segundo a *Amazon Web Services* (AWS) (s.d.), uma API define as regras que você precisa seguir para se comunicar com outros sistemas de *software*. Os desenvolvedores expõem ou criam APIs para que outras aplicações possam se comunicar com suas aplicações programaticamente. Por exemplo, a aplicação de planilha de horas expõe uma API que solicita o nome completo de um funcionário e um intervalo de datas. Ao receber essas informações, processa internamente a planilha de horas do funcionário e retorna o número de horas trabalhadas nesse intervalo de datas.

Por outro lado, REST é uma arquitetura de *software* que impõe condições sobre como uma API deve funcionar. Uma arquitetura baseada em REST possibilita a comunicação confiável e de alta performance em escala.

Dado isso, uma API REST é a API que implementa as condições impostas pela aquitetura REST de maneira exímia e garante confiabilidade e performance.

No caso deste trabalho, foi utilizado um *framework* do Node.js chamado Fastify, que é um framework web altamente focado em fornecer a melhor experiência ao desenvolvedor com o mínimo de sobrecarga e uma arquitetura de plugin poderosa.

Para consolidar a segurança e o controle de sessão gerando confiabilidade na identidade dos usuários, a aplicação integra a biblioteca *better-auth*, responsável por gerenciar fluxos de autenticação via *cookies* seguros (HttpOnly). Esta estrutura é base para um sistema robusto de gerenciamento granular de permissões (sejam diretas ou vinculadas a perfis específicos por espaços predefinidos).

Adjunto, para que estes dados sejam persistidos, o sistema utiliza o Drizzle ORM, que como o nome sugere, é um ORM (Object Relational Mapping) que traduz a lógica da aplicação em chamadas SQL (Structured Query Language). 

O banco de dados utilizado é o PostgreSQL, um sistema gerenciador de banco de dados (SGBD) relacional, essencial para interligar as complexas relações estruturais entre usuários, credenciais IoT, salas, tentativas de acesso e perfis autorizativos.

### **4.1.3 IoT** {#4.1.3-iot}

Para a comunicação IoT, onde visamos um servidor MQTT como dito anteriormente, foi utilizado também o Node.js, mas desta vez com uma biblioteca chamada Aedes, o qual implementa o MQTT sobre o serviço Node.js, construindo seus canais de assinatura da comunicação *pub/sub*.

### **4.1.4 Documentação** {#4.1.4-documentação}

Tanto a API REST quanto o servidor MQTT, eles fornecem URLs (Uniform Resource Locator) para acesso, seja para *endpoints*, ou para canais de assinatura. Estas URLs podem ser especificadas com o que se espera de entrada e saída.

Pensando nisso, foi elaborada, por meio da ferramenta Swagger, uma página *web* que descreve essas rotas de API, permitindo visualizar entradas e saídas e testá-las livremente. Complementarmente à especificação da API, desenvolveu-se uma documentação técnica e arquitetural robusta integrada à própria aplicação por meio do *framework* FumaDocs. Essa documentação, acessível de forma otimizada via rota `/docs`, agrupa guias de início rápido, arquitetura do banco de dados, matrizes de permissões e detalhes minuciosos do protocolo lógico MQTT do projeto, garantindo transparência e facilidade de manutenção para futuros desenvolvedores da instituição acadêmica.

## **4.2 Desenvolvimento estrutural e funcional** {#4.2-desenvolvimento-parcial}

Nesta seção são descritos os módulos sistêmicos já concluídos. A arquitetura de *software* do projeto encontra-se amplamente estruturada e interligada digitalmente.

No escopo de *back-end*, estão funcionais e consumíveis os *endpoints* da API para fluxos diretos de autenticação, operações de CRUD (Create, Read, Update, Delete) avançadas de usuários, locais físicos (blocos, salas, tipos) e gerenciamento de perfis e matrizes de permissões. A infraestrutura fundamental de banco de dados relacional via ORM também opera plenamente.

Para a comunicação de IoT, o *Broker MQTT* desenvolvido desempenha unicamente as operações intrínsecas de conexão de dispositivos (registro autônomo na rede), fornecendo suporte simultâneo ativo com filas de comandos (*commands queue*). O ecossistema mantém toda a sincronia de atividade (*heartbeat* das fechaduras ativas nas salas do *campus*).

### **4.2.1 Banco de dados** {#4.2.1-banco-de-dados}

Foi desenvolvido uma base de dados já pensando em todos os aspectos inerentes à este trabalho, como informações sobre conta, sessão, usuário, porta, comando para a porta, permissão do usuário à porta, controlador da porta, credencial de acesso, *log* de acesso, sala, bloco, etc.

##### **Figura 13\. Modelo lógico relacional do banco de dados.** {#figura-13.-modelo-lógico-relacional-do-banco-de-dados.}

![][image14]

Fonte: Autor

	Diante disso, temos uma base robusta pronta para receber e operar as informações para a aplicação.

### **4.2.2 Protótipo das telas do front-end** {#4.2.2-protótipo-das-telas-do-front-end}

Antes que o front-end fosse iniciado, foi iniciado um protótipo utilizando o Figma para isso. Neste, foi previsto telas de listagem de salas, usuários e informações sobre salas.

#####  **Figura 14\. Listagem de salas e informações.** {#figura-14.-listagem-de-salas-e-informações.}

![][image15]

Fonte: Autor

### **4.2.3 Desenvolvimento do front-end** {#4.2.3-desenvolvimento-do-front-end}

Neste ponto prático, foi desenvolvida uma aplicação complexa com Vite, Tailwind CSS, Shadcn, TanStack Start e TanStack Query, capaz não só de operacionalizar o que é requerido minimamente das salas para exibição informativa, mas englobar todas as funções administrativas de infraestrutura necessárias pelo painel na web.

A aplicação front-end também abrange interfaces de gerenciamento e o manejo interativo com matrizes de restrição e credenciais de identidades (como o mapa digital via componente *FingerprintHandDrawer*) antes mesmo das ordens de sincronia repassados ao hardware restrito.

#####  **Figura 15\. Página de interações e informações reagentes na plataforma.** {#figura-15.-página-react.}

![][image16]

Fonte: Autor

O sistema já é passível e exibe todas as modificações reativas sobre a base de dados administrativa do PostgreSQL.

### **4.2.4 Desenvolvimento do back-end** {#4.2.4-desenvolvimento-do-back-end}

Foi criado aqui os *endpoints* como mostrados no Swagger na Figura 14, estes foram criados a fim de que o *front-end* os consuma, a própria documentação do Swagger, o banco de dados PostgreSQL utilizando o Drizzle ORM e as operações sobre os dados.

##### **Figura 14\. Alguns endpoints documentados pelo Swagger.** {#figura-14.-alguns-endpoints-documentados-pelo-swagger.}

![][image17]

Fonte: Autor

Essa é a parte crucial onde é feita a manipulação dos dados para que elas sejam processadas e emitidas como o esperado.

### **4.2.5 Integração Contínua/Entrega Contínua** {#4.2.5-integração-contínua/entrega-contínua}

Integração Contínua/Entrega Contínua ou apenas CI/CD é a forma de fazer que as mudanças feitas e homologadas sejam emitidas facilmente ao usuário final. Este foi desenvolvido utilizando *pipelines* do GitHub Actions. 

Para isso, foi desenvolvido, em conjunto com o Docker, trechos de código capazes de automatizar a implantação do sistema no servidor. 

# **5\. CONSIDERAÇÕES PARCIAIS**

Durante a execução da espinha computacional algorítmica, o projeto logrou excelência ao processar sua lógica em ponta-a-ponta, tendo todas as camadas primárias de sistema interligadas e terminadas: painel responsivo web comunicando ativamente aos protocolos da estrutura da API com suas credenciais próprias restritas a perfis autênticos, bem como os subsistemas com suas documentações, gerenciamento de persistência local relacional em blocos seguros (SGBD) e as requisições ativando processos nativos via *broker* de MQTT na teia IoT.

Foi validado por meio destas tecnologias robustas a integração assíncrona funcional do trânsito na verificação local. Estas simulações transitanm via linha de comando com a sintaxe do *Client URL* (cURL) ou direto sob as ordens simuladas através dos serviços emuladas da página de documentação no *Swagger*.

Desta forma, todo controle tecnológico primário digital do portal administrativo encontra-se encerrado com sucesso nesta fase. Para concluir inteiramente os rumos da proposta deste curso de ciência, o esforço tático da próxima subetapa será destinado incondicionalmente à concretização material interacional de *hardware*.

Nesse ambiente eletrônico adjacente, compõe o fluxo restante a programação (arquivos *firmware* independentes com código ativamente não bloqueante em módulos como `config.h`), montada ao entorno do controlador micro ESP32 conectado paralelamente e fisicamente via pinagem aos respectivos coletores das credenciais – o biometrista óptico (sensor ZN-53X) ou os sensores rádio antena, em conformidade a RFID associados, bem como atuadores (módulo relé acionando o estado magnético que abre fisicamente a porta trancada pela trava física eletrônica solenoide). Com tais fechaduras materiais montadas nas portas de acesso da própria faculdade associada ao IFSP local, conclui-se plenamente qualquer restrição tangível e o controle remoto de passagens pretendida como um todo ecológico.

# **6\. REFERÊNCIAS** {#6.-referências}

ANIRU, Muhammed Abudu; OSASENAGA, Enoma Victor; EMMANUEL, Osamwonyi Efosa; GERALD, Matthew Onyeka; MELODY, Emede Oghenekome. **Design and Construction of a Smart Lock System using Internet of Things (IoT)**. In: International Journal of Informatics Information System and Computer Engineering (INJIISCOM), \[S. l.\], v. 6, n. 1, p. 82–95, 2024\. DOI: 10.34010/injiiscom.v6i1.14127. Disponível em: https://ojs.unikom.ac.id/index.php/injiiscom/article/view/14127. Acesso em: 18 oct. 2025\.

ARATEK. **The Fingerprint File**: 4 Fingerprint Sensor Types. Aratek, 2023\. Disponível em: https://www.aratek.co/news/the-4-fingerprint-sensor-types. Acesso em: 17 nov. 2025\.

ASHTON, Kevin. **That ‘Internet of Things’ Thing**. RFID Journal, 2009\. Disponível em: https://www.rfidjournal.com/expert-views/that-internet-of-things-thing/73881/. Acesso em: 18 nov. 2025\.

BANKS, Andrew; BRIGGS, Ed; BORGENDALE, Ken; GUPTA, Rahul. **MQTT Version 5.0**. OASIS Standard, 7 mar. 2019\. Disponível em: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html. Acesso em: 19 nov. 2025\.

CNN BRASIL. **Internet das Coisas**: o que é, como funciona e exemplos de uso. 2023\. Disponível em: https://www.cnnbrasil.com.br/tecnologia/internet-das-coisas/. Acesso em 17 nov. 2025\.

DOCKER, INC. **Docker**: Accelerated Container Application Development. Docker, \[s.d.\]. Disponível em: https://www.docker.com/. Acesso em: 22 nov. 2025\.

DRIZZLE TEAM. **Drizzle ORM**. Drizzle Team, \[s.d.\]. Disponível em: https://orm.drizzle.team/. Acesso em: 17 nov. 2025\.

FASTIFY. **Fastify**: Fast and low overhead web framework, for Node.js. Fastify, \[s.d.\]. Disponível em: https://fastify.dev/. Acesso em: 17 nov. 2025\.

FINKENZELLER, Klaus. **RFID Handbook**: Fundamentals and Applications in Contactless Smart Cards, Radio Frequency Identification and Near-Field Communication, 3 ed. Wiley-Blackwell, Oxford, 2010\.

GITHUB. **GitHub Actions**. GitHub, \[s.d.\]. Disponível em: https://github.com/features/actions?locale=pt-BR. Acesso em: 22 nov. 2025\.

GONÇALVES, Luiz Carlos. **Sistema de Controle de Acesso Físico por Dispositivos com Identificação por RFID e Autenticação por Biometria de Impressão Digital**. 2025\. Monografia (Graduação em Engenharia de Controle e Automação) – Escola de Minas, Universidade Federal de Ouro Preto, Ouro Preto , 2025\.

GUBBI, Jayavardhana; BUYYA, Rajkumar; MARUSIC, Slaven; PALANISWAMI, Marimuthu. **Internet of Things (IoT)**: A vision, architectural elements, and future directions. Future Generation Computer Systems, v. 29, n. 7, p. 1645-1660, 2013\.

KASPERSKY. **O que é biometria e como é utilizada na segurança?** Kaspersky, \[s.d.\]. Disponível em: https://www.kaspersky.com.br/resource-center/definitions/biometrics. Acesso em: 16 nov. 2025\.

MOSCAJS. **Aedes**: Barebone MQTT Broker. GitHub, \[s.d.\]. Disponível em: https://github.com/moscajs/aedes. Acesso em: 22 nov. 2025\.

NODE.JS. **Node.js**: Run JavaScript Everywhere. Node.js, \[s.d.\]. Disponível em: https://nodejs.org/. Acesso em: 17 nov. 2025\.

PINHEIRO, José Maurício. **Biometria nos Sistemas Computacionais**: Você é a Senha. Rio de Janeiro: Ciência Moderna, 2008\.

POSITIVO CASA INTELIGENTE. **Smart Fechadura Wi-Fi de Embutir**. \[s.d.\]. Disponível em: https://www.positivocasainteligente.com.br/smart-fechadura-embutir. Acesso em: 18 out. 2025\.

POSTGRESQL GLOBAL DEVELOPMENT GROUP. **PostgreSQL**. PostgreSQL, \[s.d.\]. Disponível em: https://www.postgresql.org/. Acesso em: 17 nov. 2025\.

PUHLMANN, Henrique Frank Werner. **Introdução à tecnologia de identificação RFID**. ResearchGate, 2015\. Disponível em: https://www.researchgate.net/publication/277954223\_Introducao\_a\_tecnologia\_de\_identificacao\_RFID. Acesso em: 18 nov. 2025\.

RAHMAN, Mijanur. **Study on Introducing Biometric Fingerprint Authentication in Automated Student Attendance System**. In: New Visions in Science and Technology. \[S.L.\], p. 126, 2021\. DOI: 10.9734/bpi/nvst/v4/4580F. Disponível em: https://www.researchgate.net/publication/354801909\_Study\_on\_Introducing\_Biometric\_Fingerprint\_Authentication\_in\_Automated\_Student\_Attendance\_System/. Acesso em: 17 nov 2025\.

REACT. **Thinking in React**. React, \[s.d.\]. Disponível em: https://react.dev/learn/thinking-in-react. Acesso em: 17 nov. 2025\.

SHADCN. **Shadcn UI**. Shadcn, \[s.d.\]. Disponível em: https://ui.shadcn.com/. Acesso em: 17 nov. 2025\.

STALLINGS, William. **Criptografia e segurança de redes**: princípios e práticas. 6\. ed. São Paulo: Pearson, 2015\. E-book. Disponível em: https://plataforma.bvirtual.com.br. Acesso em: 15 nov 2025\.

TAILWIND LABS. **Tailwind CSS**. Tailwind Labs, \[s.d.\]. Disponível em: https://tailwindcss.com/. Acesso em: 17 nov. 2025\.

TANSTACK. **Tanstack Query**: Overview. TanStack, \[s.d.\]. Disponível em: https://tanstack.com/query/latest/docs/framework/react/overview. Acesso em: 22 nov. 2025\.

YAHYA, Faridah; NASIR, Haidawati; KADIR, Kushsairy; SAFIE, Sairul; KHAN, Sheroz; GUNAWAN, Teddy Surya. **Fingerprint Biometric Systems**. Trends in Bioinformatics, v. 9, p. 52–58, 2016\.