import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import CreateChallengeForm from "@/components/arena/CreateChallengeForm";

const CreateChallenge: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (challengeData: any) => {
    setIsSubmitting(true);
    // TODO: Implement challenge creation logic
    console.log("Creating challenge:", challengeData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    navigate("/app");
  };

  return (
    <>
      <Helmet>
        <title>Create Challenge - USDFG Arena | USDFGAMING</title>
        <meta name="description" content="Create a new skill-based gaming challenge in the USDFG Arena." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
        {/* Header */}
        <header className="border-b border-gray-800 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/app">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Arena
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-black" />
                </div>
                <h1 className="text-xl font-bold text-white">Create Challenge</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-2xl">New Gaming Challenge</CardTitle>
                <p className="text-gray-400">
                  Set up a skill-based challenge and let the best gamer win.
                </p>
              </CardHeader>
              <CardContent>
                <CreateChallengeForm 
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
};

export default CreateChallenge;
