export const verifyAccess = async (payload: {
  roomId: string;
  credentialValue: string;
  type: "BIOMETRY" | "RFID";
}) => {
  // Implementar lógica: identificar usuário pela credencial, checar permissões diretas e via perfil,
  // validar expiração e requisitos multimodais da sala.
  return { granted: false, reason: "NOT_IMPLEMENTED" } as const;
};
