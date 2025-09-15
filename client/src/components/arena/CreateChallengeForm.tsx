import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Gamepad2, DollarSign, Clock, Users } from "lucide-react";

interface CreateChallengeFormProps {
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const CreateChallengeForm: React.FC<CreateChallengeFormProps> = ({
  onSubmit,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    game: "",
    category: "",
    entryFee: "",
    maxPlayers: "2",
    timeLimit: "30",
    rules: "",
    customRules: ""
  });

  const gameOptions = {
    Fighting: ["Street Fighter 6", "Tekken 8", "Mortal Kombat 1", "Guilty Gear Strive"],
    Racing: ["F1 2023", "Mario Kart 8", "Gran Turismo 7", "Forza Horizon 5"],
    Shooting: ["Call of Duty: MW3", "Fortnite", "Valorant", "Apex Legends"],
    Sports: ["EA UFC 6", "FIFA 24", "Madden 24", "NBA 2K24"]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Game Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="category" className="text-sm font-medium text-gray-400 mb-2 block">
            Game Category
          </Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
            <SelectTrigger className="bg-background border-gray-700 text-white">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(gameOptions).map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="game" className="text-sm font-medium text-gray-400 mb-2 block">
            Specific Game
          </Label>
          <Select 
            value={formData.game} 
            onValueChange={(value) => handleInputChange("game", value)}
            disabled={!formData.category}
          >
            <SelectTrigger className="bg-background border-gray-700 text-white">
              <SelectValue placeholder="Select game" />
            </SelectTrigger>
            <SelectContent>
              {formData.category && gameOptions[formData.category as keyof typeof gameOptions]?.map((game) => (
                <SelectItem key={game} value={game}>
                  {game}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Challenge Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="entryFee" className="text-sm font-medium text-gray-400 mb-2 block">
            Entry Fee ($USDFG)
          </Label>
          <Input
            id="entryFee"
            type="number"
            placeholder="10.00"
            value={formData.entryFee}
            onChange={(e) => handleInputChange("entryFee", e.target.value)}
            className="bg-background border-gray-700 text-white"
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div>
          <Label htmlFor="maxPlayers" className="text-sm font-medium text-gray-400 mb-2 block">
            Max Players
          </Label>
          <Select value={formData.maxPlayers} onValueChange={(value) => handleInputChange("maxPlayers", value)}>
            <SelectTrigger className="bg-background border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Players</SelectItem>
              <SelectItem value="4">4 Players</SelectItem>
              <SelectItem value="8">8 Players</SelectItem>
              <SelectItem value="16">16 Players</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="timeLimit" className="text-sm font-medium text-gray-400 mb-2 block">
            Time Limit (minutes)
          </Label>
          <Select value={formData.timeLimit} onValueChange={(value) => handleInputChange("timeLimit", value)}>
            <SelectTrigger className="bg-background border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rules */}
      <div>
        <Label htmlFor="rules" className="text-sm font-medium text-gray-400 mb-2 block">
          Challenge Rules
        </Label>
        <Select value={formData.rules} onValueChange={(value) => handleInputChange("rules", value)}>
          <SelectTrigger className="bg-background border-gray-700 text-white">
            <SelectValue placeholder="Select standard rules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="best-of-3">Best of 3</SelectItem>
            <SelectItem value="best-of-5">Best of 5</SelectItem>
            <SelectItem value="first-to-5">First to 5</SelectItem>
            <SelectItem value="first-to-10">First to 10</SelectItem>
            <SelectItem value="custom">Custom Rules</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.rules === "custom" && (
        <div>
          <Label htmlFor="customRules" className="text-sm font-medium text-gray-400 mb-2 block">
            Custom Rules
          </Label>
          <Textarea
            id="customRules"
            rows={4}
            placeholder="Describe your custom rules clearly..."
            value={formData.customRules}
            onChange={(e) => handleInputChange("customRules", e.target.value)}
            className="bg-background border-gray-700 text-white"
            required={formData.rules === "custom"}
          />
        </div>
      )}

      {/* Challenge Preview */}
      {formData.game && formData.entryFee && (
        <Card className="bg-card/30 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Challenge Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Gamepad2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-sm text-gray-400">Game</p>
                  <p className="text-white font-semibold">{formData.game}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Entry Fee</p>
                  <p className="text-white font-semibold">{formData.entryFee} $USDFG</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Players</p>
                  <p className="text-white font-semibold">{formData.maxPlayers}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-400">Time Limit</p>
                  <p className="text-white font-semibold">{formData.timeLimit}m</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Prize Pool:</span>
                <span className="text-2xl font-bold text-cyan-400">
                  {(parseFloat(formData.entryFee) * parseInt(formData.maxPlayers)).toFixed(2)} $USDFG
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
          disabled={isSubmitting || !formData.game || !formData.entryFee}
          className="bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold hover:brightness-110"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isSubmitting ? "Creating Challenge..." : "Create Challenge"}
        </Button>
      </div>
    </form>
  );
};

export default CreateChallengeForm;
