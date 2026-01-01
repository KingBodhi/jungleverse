-- CreateIndex
CREATE INDEX "CashGame_smallBlind_bigBlind_idx" ON "CashGame"("smallBlind", "bigBlind");

-- CreateIndex
CREATE INDEX "Game_variant_idx" ON "Game"("variant");

-- CreateIndex
CREATE INDEX "Game_pokerRoomId_variant_idx" ON "Game"("pokerRoomId", "variant");
